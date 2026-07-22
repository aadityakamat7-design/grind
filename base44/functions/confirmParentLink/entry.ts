import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Parent-teen linking. The teen's connection code + the parent's explicit
// attestation of the relationship are enough to confirm the link and activate
// the teen's account. Stripe Identity verification is tracked separately (for
// payouts) and never blocks this connection.
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
    if (!teen) return Response.json({ error: 'No teen found with that code — double-check and try again.' }, { status: 404 });
    if (teen.user_id === user.id) return Response.json({ error: 'You cannot link to your own account.' }, { status: 400 });

    const parentProfiles = await svc.ParentProfile.filter({ user_id: user.id });
    const identityVerified = !!parentProfiles[0]?.is_identity_verified;

    const now = new Date().toISOString();
    const data = {
      teen_profile_id: teen.id,
      teen_display_name: teen.display_name,
      identity_verified: identityVerified,
      relationship_confirmed: true,
      relationship_attested_at: now,
      status: 'confirmed',
      confirmed_at: now,
    };

    const existing = await svc.ParentTeenLink.filter({ parent_user_id: user.id, teen_user_id: teen.user_id });
    if (existing[0]) {
      await svc.ParentTeenLink.update(existing[0].id, data);
    } else {
      await svc.ParentTeenLink.create({ parent_user_id: user.id, teen_user_id: teen.user_id, ...data });
    }

    await svc.TeenProfile.update(teen.id, { status: 'active', parent_identity_verified: identityVerified });
    await svc.Notification.create({
      user_id: teen.user_id,
      type: 'approval',
      title: 'Your account is live! 🎉',
      body: `${user.full_name || 'Your parent'} confirmed your link. You can now publish services and take jobs.`,
      link: '/teen',
    });
    await svc.Notification.create({
      user_id: user.id,
      type: 'approval',
      title: `You're linked with ${teen.display_name}! 🎉`,
      body: `You'll now see their bookings, income, and safety status on your dashboard.`,
      link: '/parent',
    });

    return Response.json({ linked: true, fullyVerified: true, teenName: teen.display_name });
  } catch (error) {
    console.error('confirmParentLink error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});