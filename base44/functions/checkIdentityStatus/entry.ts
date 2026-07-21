import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import Stripe from 'npm:stripe@17.5.0';
import { applyVerifiedIdentity } from '../../shared/identityVerification.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const profiles = await base44.entities.ParentProfile.filter({ user_id: user.id });
    const profile = profiles[0];
    if (!profile) return Response.json({ status: 'unverified' });
    if (profile.is_identity_verified) return Response.json({ status: 'verified' });
    if (!profile.identity_session_id) return Response.json({ status: 'unverified' });

    const result = await applyVerifiedIdentity(base44, stripe, profile.identity_session_id);

    if (result.verified) {
      return Response.json({ status: 'verified' });
    }

    // Session finished but did not pass
    if (result.status === 'requires_input' && result.lastError) {
      await base44.entities.ParentProfile.update(profile.id, { identity_status: 'failed' });
      return Response.json({ status: 'failed', reason: result.lastError });
    }
    if (result.status === 'failed') {
      await base44.entities.ParentProfile.update(profile.id, { identity_status: 'failed' });
      return Response.json({ status: 'failed', reason: result.lastError });
    }

    // processing / requires_input without error yet
    return Response.json({ status: result.status });
  } catch (error) {
    console.error('checkIdentityStatus error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});