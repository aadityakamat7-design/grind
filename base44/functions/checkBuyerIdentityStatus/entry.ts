import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getStripeForApp } from '../../shared/stripeEnv.ts';
import { applyBuyerVerifiedIdentity } from '../../shared/buyerIdentityVerification.ts';

// Polls the buyer's Stripe Identity session and persists the result.
// Serves as a fallback to the webhook in case the webhook hasn't arrived yet.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const stripe = await getStripeForApp(base44);
    const profiles = await base44.entities.BuyerProfile.filter({ user_id: user.id });
    const profile = profiles[0];
    if (!profile) return Response.json({ status: 'unverified' });
    if (profile.id_verification_status === 'verified') return Response.json({ status: 'verified' });
    if (!profile.identity_session_id) return Response.json({ status: 'unverified' });

    let result;
    try {
      result = await applyBuyerVerifiedIdentity(base44, stripe, profile.identity_session_id);
    } catch (err) {
      if (/No such VerificationSession/i.test(err.message || '')) {
        console.error(`Stale buyer identity session ${profile.identity_session_id} for user ${user.id}: ${err.message}`);
        await base44.asServiceRole.entities.BuyerProfile.update(profile.id, {
          identity_session_id: '',
          id_verification_status: 'pending',
        });
        return Response.json({ status: 'unverified' });
      }
      throw err;
    }

    if (result.verified) {
      return Response.json({ status: 'verified' });
    }

    if (result.status === 'requires_input' && result.lastError) {
      await base44.asServiceRole.entities.BuyerProfile.update(profile.id, { id_verification_status: 'failed' });
      return Response.json({ status: 'failed', reason: result.lastError });
    }
    if (result.status === 'failed') {
      await base44.asServiceRole.entities.BuyerProfile.update(profile.id, { id_verification_status: 'failed' });
      return Response.json({ status: 'failed', reason: result.lastError });
    }

    return Response.json({ status: result.status });
  } catch (error) {
    console.error('checkBuyerIdentityStatus error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});