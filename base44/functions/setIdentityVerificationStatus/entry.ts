import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Admin-only toggle for Stripe Identity verification. When disabled, parents
// can link to their teen and approve bookings without completing Stripe
// Identity (government ID + liveness). Stripe Connect onboarding for payouts
// remains required regardless. Defaults to enabled (true / fails safe).
//
// The flag is stored in AppSetting so it survives restarts and can't be
// flipped by a non-admin — only an admin can write AppSetting (RLS), and this
// function re-checks app_role server-side regardless.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.app_role !== 'admin') {
      return Response.json({ error: 'Forbidden — admins only' }, { status: 403 });
    }

    const { enabled } = await req.json();
    const value = enabled === false ? 'false' : 'true';

    const existing = await base44.asServiceRole.entities.AppSetting.filter({ key: 'identity_verification_enabled' });
    if (existing[0]) {
      await base44.asServiceRole.entities.AppSetting.update(existing[0].id, {
        value,
        updated_by_id: user.id,
      });
    } else {
      await base44.asServiceRole.entities.AppSetting.create({
        key: 'identity_verification_enabled',
        value,
        label: 'Stripe Identity verification',
        updated_by_id: user.id,
      });
    }

    console.log(`Identity verification set to ${value} by ${user.email}`);
    return Response.json({ enabled: value === 'true' });
  } catch (error) {
    console.error('setIdentityVerificationStatus error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});