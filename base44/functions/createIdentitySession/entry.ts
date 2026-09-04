import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { getStripeForApp } from '../../shared/stripeEnv.ts';
import { getSafeOrigin, safeOriginFromString } from '../../shared/safeOrigin.ts';

// Accepts either a relative path (starting with a single "/") or a full
// https URL on a trusted app domain. Relative paths are anchored to the
// request's safe origin; full URLs are validated and used as-is so the
// frontend can preserve the exact path + query (e.g. ?identity_return=1).
function safeReturnUrl(req: Request, returnUrl?: string): string {
  if (typeof returnUrl !== 'string') return getSafeOrigin(req);
  // Relative path — anchor to the safe origin.
  if (returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
    return `${getSafeOrigin(req)}${returnUrl}`;
  }
  // Full URL — validate its origin is a trusted app domain, then use as-is.
  try {
    const url = new URL(returnUrl);
    if (url.protocol === 'https:') {
      const safe = safeOriginFromString(returnUrl);
      // safeOriginFromString returns APP_BASE_URL when the host isn't trusted,
      // so only accept the full URL when it round-trips unchanged.
      if (safe === url.origin) return returnUrl;
    }
  } catch {
    // fall through
  }
  return getSafeOrigin(req);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { returnUrl, testMode } = await req.json();
    // Live keys by default; test mode is admin-only for development, so real
    // users always verify against real government IDs.
    const stripe = await getStripeForApp(base44);

    // Find or create the parent profile
    const profiles = await base44.entities.ParentProfile.filter({ user_id: user.id });
    let profile = profiles[0];
    if (!profile) {
      profile = await base44.asServiceRole.entities.ParentProfile.create({
        user_id: user.id,
        full_name: user.full_name || '',
        connect_status: 'not_setup',
        identity_status: 'unverified',
      });
    }
    if (profile.is_identity_verified) {
      return Response.json({ alreadyVerified: true });
    }

    const session = await stripe.identity.verificationSessions.create({
      type: 'id_number',
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        user_id: user.id,
      },
      return_url: safeReturnUrl(req, returnUrl),
    });

    await base44.asServiceRole.entities.ParentProfile.update(profile.id, {
      identity_session_id: session.id,
      identity_status: 'processing',
    });

    return Response.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('createIdentitySession error:', error.message);
    const friendly = /not set up to use Identity|identity\/use-cases|identity\/application/i.test(error.message || '')
      ? 'ID verification is temporarily unavailable — Stripe Identity has not been activated on the platform account yet. Please try again later.'
      : 'Something went wrong';
    return Response.json({ error: friendly }, { status: 500 });
  }
});