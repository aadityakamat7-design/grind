// Shared logic for finalizing identity verification and persisting verified status.

// Marks a parent as identity-verified (service role) and surfaces the trust
// signal on any linked teen profiles. Creates the profile if it doesn't exist.
export async function markParentVerified(base44, userId, extra = {}, fullName = '') {
  const profiles = await base44.asServiceRole.entities.ParentProfile.filter({ user_id: userId });
  let profile = profiles[0];
  const update = {
    identity_status: 'verified',
    is_identity_verified: true,
    verified_at: new Date().toISOString(),
    ...extra,
  };
  if (profile) {
    await base44.asServiceRole.entities.ParentProfile.update(profile.id, update);
  } else {
    profile = await base44.asServiceRole.entities.ParentProfile.create({
      user_id: userId,
      full_name: fullName,
      ...update,
    });
  }

  const links = await base44.asServiceRole.entities.ParentTeenLink.filter({ parent_user_id: userId });
  for (const link of links) {
    if (link.teen_profile_id) {
      await base44.asServiceRole.entities.TeenProfile.update(link.teen_profile_id, {
        parent_identity_verified: true,
      });
    }
  }
  return profile;
}

// Re-checks a Stripe Identity session's document + selfie results and persists
// verified data to the parent profile.
export async function applyVerifiedIdentity(base44, stripe, sessionId) {
  const session = await stripe.identity.verificationSessions.retrieve(sessionId, {
    expand: ['verified_outputs.dob', 'verified_outputs.id_number'],
  });

  if (session.status !== 'verified') {
    return { verified: false, status: session.status, lastError: session.last_error?.reason || null };
  }

  const reports = await stripe.identity.verificationReports.list({
    verification_session: session.id,
    limit: 1,
  });
  const report = reports.data[0];
  const documentOk = report?.document?.status === 'verified';
  const selfieOk = report?.selfie?.status === 'verified';
  if (!documentOk || !selfieOk) {
    return { verified: false, status: 'failed', lastError: 'Document or selfie check did not pass' };
  }

  const userId = session.metadata?.user_id;
  if (!userId) return { verified: false, status: 'failed', lastError: 'Missing user metadata' };

  const vo = session.verified_outputs || {};
  const dob = vo.dob
    ? `${vo.dob.year}-${String(vo.dob.month).padStart(2, '0')}-${String(vo.dob.day).padStart(2, '0')}`
    : undefined;

  const extra = { id_type: report?.document?.type || 'unknown' };
  if (dob) extra.dob = dob;
  if (vo.id_number) extra.id_number = vo.id_number;

  await markParentVerified(base44, userId, extra);

  return { verified: true, status: 'verified' };
}