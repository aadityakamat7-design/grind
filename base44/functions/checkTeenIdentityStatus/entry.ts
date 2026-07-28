import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getStripe } from '../../shared/stripeEnv.ts';
import { applyTeenVerifiedIdentity } from '../../shared/teenIdentityVerification.ts';

// Polls the teen's Stripe Identity session and persists the result.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const stripe = getStripe(body.testMode === true && user.role === 'admin');
    const profiles = await base44.entities.TeenProfile.filter({ user_id: user.id });
    const profile = profiles[0];
    if (!profile) return Response.json({ status: 'unverified' });
    if (profile.identity_status === 'verified') return Response.json({ status: 'verified' });
    if (!profile.identity_session_id) return Response.json({ status: 'unverified' });

    let result;
    try {
      result = await applyTeenVerifiedIdentity(base44, stripe, profile.identity_session_id);
    } catch (err) {
      if (/No such VerificationSession/i.test(err.message || '')) {
        console.error(`Stale teen identity session ${profile.identity_session_id} for user ${user.id}: ${err.message}`);
        await base44.asServiceRole.entities.TeenProfile.update(profile.id, {
          identity_session_id: '',
          identity_status: 'unverified',
        });
        return Response.json({ status: 'unverified' });
      }
      throw err;
    }

    if (result.verified) {
      return Response.json({ status: 'verified' });
    }

    if (result.status === 'requires_input' && result.lastError) {
      await base44.asServiceRole.entities.TeenProfile.update(profile.id, { identity_status: 'failed' });
      return Response.json({ status: 'failed', reason: result.lastError });
    }
    if (result.status === 'failed') {
      await base44.asServiceRole.entities.TeenProfile.update(profile.id, { identity_status: 'failed' });
      return Response.json({ status: 'failed', reason: result.lastError });
    }

    return Response.json({ status: result.status });
  } catch (error) {
    console.error('checkTeenIdentityStatus error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});