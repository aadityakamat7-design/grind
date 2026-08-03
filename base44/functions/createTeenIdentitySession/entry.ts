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

// Creates a Stripe Identity verification session for a teen. Triggered the
// first time a teen accepts a job — the teen must verify before the parent
// can approve that first booking.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { returnUrl, testMode } = await req.json();
    const stripe = getStripe(testMode === true && user.app_role === 'admin');

    const profiles = await base44.entities.TeenProfile.filter({ user_id: user.id });
    const profile = profiles[0];
    if (!profile) return Response.json({ error: 'Teen profile not found.' }, { status: 404 });
    if (profile.identity_status === 'verified') {
      return Response.json({ alreadyVerified: true });
    }

    const session = await stripe.identity.verificationSessions.create({
      type: 'id_number',
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        user_id: user.id,
        verification_subject: 'teen',
      },
      return_url: safeReturnUrl(req, returnUrl),
    });

    await base44.asServiceRole.entities.TeenProfile.update(profile.id, {
      identity_session_id: session.id,
      identity_status: 'processing',
    });

    return Response.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('createTeenIdentitySession error:', error.message);
    const friendly = /not set up to use Identity|identity\/use-cases|identity\/application/i.test(error.message || '')
      ? 'ID verification is temporarily unavailable — Stripe Identity has not been activated on the platform account yet. Please try again later.'
      : error.message;
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});