import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getStripe } from '../../shared/stripeEnv.ts';
import { getSafeOrigin } from '../../shared/safeOrigin.ts';

// Only allow relative paths (starting with a single "/") as the return URL to
// prevent open-redirect attacks via attacker-supplied external domains.
function safeReturnUrl(req: Request, returnUrl?: string): string {
  if (typeof returnUrl === 'string' && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
    return `${getSafeOrigin(req)}${returnUrl}`;
  }
  return getSafeOrigin(req);
}

// Creates a Stripe Identity verification session for a buyer (neighbor).
// Buyers must verify before their first booking — adults transact with
// minors on this platform, so identity verification is mandatory.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { returnUrl, testMode } = await req.json();
    const stripe = getStripe(testMode === true && user.role === 'admin');

    const profiles = await base44.entities.BuyerProfile.filter({ user_id: user.id });
    const profile = profiles[0];
    if (!profile) return Response.json({ error: 'Buyer profile not found.' }, { status: 404 });
    if (profile.id_verification_status === 'verified') {
      return Response.json({ alreadyVerified: true });
    }

    const session = await stripe.identity.verificationSessions.create({
      type: 'id_number',
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        user_id: user.id,
        verification_subject: 'buyer',
      },
      return_url: safeReturnUrl(req, returnUrl),
    });

    await base44.asServiceRole.entities.BuyerProfile.update(profile.id, {
      identity_session_id: session.id,
      id_verification_status: 'processing',
    });

    return Response.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('createBuyerIdentitySession error:', error.message);
    const friendly = /not set up to use Identity|identity\/use-cases|identity\/application/i.test(error.message || '')
      ? 'ID verification is temporarily unavailable — Stripe Identity has not been activated on the platform account yet. Please try again later.'
      : error.message;
    return Response.json({ error: friendly }, { status: 500 });
  }
});