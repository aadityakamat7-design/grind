import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Activates a teen profile without a parent link — only allowed for users 18+.
// The TeenProfile.status field is admin-write-only (RLS), so this server
// function is the only way for an 18+ teen to bypass the parent-link flow.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole.entities;

    // Require a Stripe-verified DOB — the self-reported date_of_birth is
    // user-writable and cannot be trusted for age-gating. verified_dob is
    // admin-write-only (RLS), so only identity verification can set it.
    const privateRecords = await svc.TeenPrivateData.filter({ user_id: user.id });
    const privateData = privateRecords[0];
    if (!privateData || !privateData.verified_dob) {
      return Response.json({ error: 'Identity verification required to activate without a parent.' }, { status: 403 });
    }

    const dob = new Date(privateData.verified_dob);
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;

    if (age < 18) {
      return Response.json({ error: 'Only users 18 and older can activate without a parent.' }, { status: 403 });
    }

    const profiles = await svc.TeenProfile.filter({ user_id: user.id });
    if (!profiles[0]) return Response.json({ error: 'Profile not found.' }, { status: 404 });
    await svc.TeenProfile.update(profiles[0].id, { status: 'active' });

    return Response.json({ success: true, activated: true });
  } catch (error) {
    console.error('activateIndependentTeen error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});