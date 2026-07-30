// Shared logic for teen identity verification (distinct from parent identity).
// Teens verify the first time they accept a job; once verified, the status
// persists and is never re-triggered.

// Marks a teen as identity-verified (service role). When a Stripe-verified DOB
// is available, it is persisted to TeenPrivateData as the source of truth for
// age/eligibility checks — the self-reported age is no longer trusted.
export async function markTeenVerified(base44, userId, extra = {}, verifiedDob = '') {
  const profiles = await base44.asServiceRole.entities.TeenProfile.filter({ user_id: userId });
  if (!profiles[0]) return null;
  await base44.asServiceRole.entities.TeenProfile.update(profiles[0].id, {
    identity_status: 'verified',
    identity_verified_at: new Date().toISOString(),
    ...extra,
  });

  // Persist the Stripe-verified DOB to private data so server-side age checks
  // (hazard screening, job acceptance) use the real ID, not the self-reported
  // value a teen could inflate to unlock jobs above their legal eligibility.
  if (verifiedDob) {
    const privates = await base44.asServiceRole.entities.TeenPrivateData.filter({ user_id: userId });
    if (privates[0]) {
      await base44.asServiceRole.entities.TeenPrivateData.update(privates[0].id, { verified_dob: verifiedDob });
    }
  }
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

  // Extract the Stripe-verified DOB — this is the source of truth for the
  // teen's age going forward, replacing the self-reported value.
  const vo = session.verified_outputs || {};
  const dob = vo.dob
    ? `${vo.dob.year}-${String(vo.dob.month).padStart(2, '0')}-${String(vo.dob.day).padStart(2, '0')}`
    : '';

  await markTeenVerified(base44, userId, {}, dob);
  return { verified: true, status: 'verified' };
}