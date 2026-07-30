import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Parent-teen linking — two-factor safety model:
//   Check 1: parent identity verified (Stripe Identity: government ID + liveness)
//   Check 2: relationship attested (invite code + explicit attestation checkbox)
// The link only becomes 'confirmed' and the teen only goes 'active' when BOTH
// checks pass. If identity is not yet verified, the link stays 'pending' and
// the teen remains unlistable/unsearchable. When the parent later completes
// identity verification, markParentVerified (in identityVerification.ts)
// flips the link to confirmed and activates the teen.
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
    // relationship_confirmed is always true at this point (attestation passed).
    // The link only becomes confirmed when identity is ALSO verified.
    const fullyVerified = identityVerified;

    const data = {
      teen_profile_id: teen.id,
      teen_display_name: teen.display_name,
      identity_verified: identityVerified,
      relationship_confirmed: true,
      relationship_attested_at: now,
      ...(fullyVerified ? { status: 'confirmed', confirmed_at: now } : { status: 'pending' }),
    };

    const existing = await svc.ParentTeenLink.filter({ parent_user_id: user.id, teen_user_id: teen.user_id });
    if (existing[0]) {
      await svc.ParentTeenLink.update(existing[0].id, data);
    } else {
      await svc.ParentTeenLink.create({ parent_user_id: user.id, teen_user_id: teen.user_id, ...data });
    }

    // Only activate the teen (making them listable/searchable) when both
    // checks have passed. A pending link keeps the teen in their current state.
    await svc.TeenProfile.update(teen.id, {
      parent_identity_verified: identityVerified,
      ...(fullyVerified ? { status: 'active' } : {}),
    });

    // Stamp the parent_user_id on the teen's private data so the parent can
    // read it via RLS (DOB, exact coordinates) for oversight.
    const privateRecords = await svc.TeenPrivateData.filter({ user_id: teen.user_id });
    if (privateRecords[0]) {
      await svc.TeenPrivateData.update(privateRecords[0].id, { parent_user_id: user.id });
    }

    if (fullyVerified) {
      await svc.Notification.create({
        user_id: teen.user_id,
        type: 'approval',
        title: 'Your account is live! 🎉',
        body: `${user.full_name || 'Your parent'} confirmed your link and verified their ID. You can now publish services and take jobs.`,
        link: '/teen',
      });
      await svc.Notification.create({
        user_id: user.id,
        type: 'approval',
        title: `You're linked with ${teen.display_name}! 🎉`,
        body: `You'll now see their bookings, income, and safety status on your dashboard.`,
        link: '/parent',
      });
    } else {
      await svc.Notification.create({
        user_id: teen.user_id,
        type: 'approval',
        title: 'Parent linked — one more step',
        body: `${user.full_name || 'Your parent'} confirmed the link. They still need to verify their ID before your account goes live.`,
        link: '/teen',
      });
      await svc.Notification.create({
        user_id: user.id,
        type: 'approval',
        title: 'Link started — verify your ID',
        body: `You're linked with ${teen.display_name}. Verify your government ID to activate their account.`,
        link: '/parent',
      });
    }

    return Response.json({ linked: true, fullyVerified, teenName: teen.display_name });
  } catch (error) {
    console.error('confirmParentLink error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});