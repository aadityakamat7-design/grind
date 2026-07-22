import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { getStripe } from '../../shared/stripeEnv.ts';
import { applyVerifiedIdentity } from '../../shared/identityVerification.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    // Admin-only test mode mirrors createIdentitySession's environment separation
    const stripe = getStripe(body.testMode === true && user.role === 'admin');
    const profiles = await base44.entities.ParentProfile.filter({ user_id: user.id });
    const profile = profiles[0];
    if (!profile) return Response.json({ status: 'unverified' });
    if (profile.is_identity_verified) return Response.json({ status: 'verified' });
    if (!profile.identity_session_id) return Response.json({ status: 'unverified' });

    let result;
    try {
      result = await applyVerifiedIdentity(base44, stripe, profile.identity_session_id);
    } catch (err) {
      if (/No such VerificationSession/i.test(err.message || '')) {
        // Stale session (e.g. created under a different key mode) — reset so the user can restart
        console.error(`Stale identity session ${profile.identity_session_id} for user ${user.id}: ${err.message}`);
        await base44.asServiceRole.entities.ParentProfile.update(profile.id, {
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

    // Session finished but did not pass
    if (result.status === 'requires_input' && result.lastError) {
      await base44.asServiceRole.entities.ParentProfile.update(profile.id, { identity_status: 'failed' });
      return Response.json({ status: 'failed', reason: result.lastError });
    }
    if (result.status === 'failed') {
      await base44.asServiceRole.entities.ParentProfile.update(profile.id, { identity_status: 'failed' });
      return Response.json({ status: 'failed', reason: result.lastError });
    }

    // processing / requires_input without error yet
    return Response.json({ status: result.status });
  } catch (error) {
    console.error('checkIdentityStatus error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});