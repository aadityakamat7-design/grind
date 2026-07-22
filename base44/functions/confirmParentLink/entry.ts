import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Double-verified parent-teen linking. Two independent checks, stored separately:
//   1. identity_verified — parent passed Stripe Identity (ID + liveness)
//   2. relationship_confirmed — parent entered the teen's invite code AND
//      explicitly attested they are the teen's parent/guardian
// The link only becomes "confirmed" (and the teen only goes active) when BOTH pass.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { inviteCode, attestRelationship } = await req.json();
    if (!inviteCode) return Response.json({ error: 'inviteCode required' }, { status: 400 });
    if (attestRelationship !== true) {
      return Response.json({ error: 'You must explicitly confirm you are this teen\'s parent or legal guardian.' }, { status: 400 });
    }

    const svc = base44.asServiceRole.entities;
    const teens = await svc.TeenProfile.filter({ invite_code: String(inviteCode).trim().toUpperCase() });
    const teen = teens[0];
    if (!teen) return Response.json({ error: 'No teen found with that code. Double-check and try again.' }, { status: 404 });
    if (teen.user_id === user.id) return Response.json({ error: 'You cannot link to your own account.' }, { status: 400 });

    // Check 1: Stripe Identity result (server-verified, never client-set)
    const parentProfiles = await svc.ParentProfile.filter({ user_id: user.id });
    const identityVerified = !!parentProfiles[0]?.is_identity_verified;
    if (!identityVerified) {
      return Response.json({ error: 'Your identity must be verified with Stripe before you can be linked to a teen.' }, { status: 403 });
    }

    const now = new Date().toISOString();
    const fullyVerified = identityVerified; // relationship is being confirmed right now
    const data = {
      teen_profile_id: teen.id,
      teen_display_name: teen.display_name,
      identity_verified: identityVerified,
      relationship_confirmed: true,
      relationship_attested_at: now,
      status: fullyVerified ? 'confirmed' : 'pending',
      ...(fullyVerified ? { confirmed_at: now } : {}),
    };

    const existing = await svc.ParentTeenLink.filter({ parent_user_id: user.id, teen_user_id: teen.user_id });
    if (existing[0]) {
      await svc.ParentTeenLink.update(existing[0].id, data);
    } else {
      await svc.ParentTeenLink.create({ parent_user_id: user.id, teen_user_id: teen.user_id, ...data });
    }

    if (fullyVerified) {
      await svc.TeenProfile.update(teen.id, { status: 'active', parent_identity_verified: true });
      await svc.Notification.create({
        user_id: teen.user_id,
        type: 'approval',
        title: 'Your account is live! 🎉',
        body: `${user.full_name || 'Your parent'} verified their identity and confirmed your link. You can now publish services and take jobs.`,
        link: '/teen',
      });
    }

    return Response.json({ linked: true, fullyVerified, teenName: teen.display_name });
  } catch (error) {
    console.error('confirmParentLink error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});