// Shared logic to finalize a Stripe Identity verification session:
// re-checks document + selfie results and persists verified data to the parent profile.
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

  const profiles = await base44.asServiceRole.entities.ParentProfile.filter({ user_id: userId });
  const profile = profiles[0];
  if (!profile) return { verified: false, status: 'failed', lastError: 'Parent profile not found' };

  const vo = session.verified_outputs || {};
  const dob = vo.dob
    ? `${vo.dob.year}-${String(vo.dob.month).padStart(2, '0')}-${String(vo.dob.day).padStart(2, '0')}`
    : undefined;

  const update = {
    identity_status: 'verified',
    is_identity_verified: true,
    id_type: report?.document?.type || 'unknown',
    verified_at: new Date().toISOString(),
  };
  if (dob) update.dob = dob;
  if (vo.id_number) update.id_number = vo.id_number;

  await base44.asServiceRole.entities.ParentProfile.update(profile.id, update);

  // Surface the trust signal on any linked teen profiles
  const links = await base44.asServiceRole.entities.ParentTeenLink.filter({ parent_user_id: userId });
  for (const link of links) {
    if (link.teen_profile_id) {
      await base44.asServiceRole.entities.TeenProfile.update(link.teen_profile_id, {
        parent_identity_verified: true,
      });
    }
  }

  return { verified: true, status: 'verified' };
}