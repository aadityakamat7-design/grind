// Shared logic for teen identity verification (distinct from parent identity).
// Teens verify the first time they accept a job; once verified, the status
// persists and is never re-triggered.

// Marks a teen as identity-verified (service role).
export async function markTeenVerified(base44, userId, extra = {}) {
  const profiles = await base44.asServiceRole.entities.TeenProfile.filter({ user_id: userId });
  if (!profiles[0]) return null;
  await base44.asServiceRole.entities.TeenProfile.update(profiles[0].id, {
    identity_status: 'verified',
    identity_verified_at: new Date().toISOString(),
    ...extra,
  });
  return profiles[0];
}

// Re-checks a Stripe Identity session and persists verified status to the teen profile.
export async function applyTeenVerifiedIdentity(base44, stripe, sessionId) {
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
  const idNumberOk = report?.id_number?.status === 'verified';
  if (!idNumberOk) {
    return { verified: false, status: 'failed', lastError: 'ID number check did not pass' };
  }

  const userId = session.metadata?.user_id;
  if (!userId) return { verified: false, status: 'failed', lastError: 'Missing user metadata' };

  await markTeenVerified(base44, userId);
  return { verified: true, status: 'verified' };
}