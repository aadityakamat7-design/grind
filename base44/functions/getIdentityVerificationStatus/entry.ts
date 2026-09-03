import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { checkRateLimit, getClientIp } from '../../shared/rateLimiter.ts';

// Public read of the identity-verification toggle. The frontend uses it to
// conditionally show/hide the Stripe Identity verification step and the
// identity consent checkbox. Returns { enabled: boolean } and defaults to
// true (enabled, fails safe) when the setting is unset or on any read error.
//
// This is a public app (no login required), so we can't use base44.auth.me().
// We reject cross-origin requests (CSRF protection) and apply rate limiting.
Deno.serve(async (req) => {
  try {
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

    const ip = getClientIp(req);
    const { allowed } = checkRateLimit(ip, 'public_getIdentityVerificationStatus');
    if (!allowed) {
      return Response.json({ enabled: true }, { status: 429 });
    }

    const base44 = createClientFromRequest(req);
    const rows = await base44.asServiceRole.entities.AppSetting.filter({ key: 'identity_verification_enabled' });
    return Response.json({ enabled: rows[0]?.value !== 'false' });
  } catch (error) {
    console.error('getIdentityVerificationStatus error:', error.message);
    return Response.json({ enabled: true });
  }
});