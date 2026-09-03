import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { checkRateLimit, getClientIp } from '../../shared/rateLimiter.ts';

// Public read of the Stripe test-mode flag. The frontend uses it to show the
// persistent TEST MODE banner on every screen. Returns { testMode: boolean }
// and defaults to false (live) when the setting is unset or on any read error,
// so the app never silently runs in test mode.
//
// This is a public app (no login required), so we can't use base44.auth.me().
// Instead we reject cross-origin requests (CSRF protection) and apply rate
// limiting to prevent abuse.
Deno.serve(async (req) => {
  try {
    // Reject cross-origin requests — only the app's own domain may call this.
    // Same-origin GETs may omit the Origin header, so we only block when an
    // Origin IS present and doesn't match a trusted Base44 app domain.
    const origin = req.headers.get('origin');
    if (origin) {
      let trusted = false;
      try {
        const url = new URL(origin);
        const host = url.hostname;
        trusted = host === 'base44.app' || host.endsWith('.base44.app') || host.endsWith('.base44.dev');
      } catch { /* invalid origin — not trusted */ }
      if (!trusted) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Rate limit by IP to prevent abuse
    const ip = getClientIp(req);
    const { allowed } = checkRateLimit(ip, 'public_getTestModeStatus');
    if (!allowed) {
      return Response.json({ testMode: false }, { status: 429 });
    }

    const base44 = createClientFromRequest(req);
    const rows = await base44.asServiceRole.entities.AppSetting.filter({ key: 'stripe_test_mode' });
    return Response.json({ testMode: rows[0]?.value === 'true' });
  } catch (error) {
    console.error('getTestModeStatus error:', error.message);
    return Response.json({ testMode: false });
  }
});