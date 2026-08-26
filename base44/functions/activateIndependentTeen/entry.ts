import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { getVerifiedAge } from '../../shared/teenAge.ts';

// Activates a teen profile without a parent link — only allowed for users 18+.
// The TeenProfile.status field is admin-write-only (RLS), so this server
// function is the only way for an 18+ teen to bypass the parent-link flow.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole.entities;

    const privateRecords = await svc.TeenPrivateData.filter({ user_id: user.id });
    const privateData = privateRecords[0];
    const age = getVerifiedAge(privateData);
    if (age == null || age < 18) {
      return Response.json({ error: 'Only users 18 and older can activate without a parent.' }, { status: 403 });
    }

    const profiles = await svc.TeenProfile.filter({ user_id: user.id });
    if (!profiles[0]) return Response.json({ error: 'Profile not found.' }, { status: 404 });
    await svc.TeenProfile.update(profiles[0].id, { status: 'active' });

    return Response.json({ success: true, activated: true });
  } catch (error) {
    console.error('activateIndependentTeen error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});