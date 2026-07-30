// Shared logic for buyer identity verification. Mirrors the parent/teen
// flows — a buyer must pass Stripe Identity (document + selfie) before
// they can book a teen, because adults transact with minors on this platform.

// Marks a buyer as identity-verified (service role).
export async function markBuyerVerified(base44, userId, extra = {}) {
  const profiles = await base44.asServiceRole.entities.BuyerProfile.filter({ user_id: userId });
  if (!profiles[0]) return null;
  await base44.asServiceRole.entities.BuyerProfile.update(profiles[0].id, {
    id_verification_status: 'verified',
    ...extra,
  });
  return profiles[0];
}

// Re-checks a Stripe Identity session and persists verified status to the buyer profile.
export async function applyBuyerVerifiedIdentity(base44, stripe, sessionId) {
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

  await markBuyerVerified(base44, userId);
  return { verified: true, status: 'verified' };
}