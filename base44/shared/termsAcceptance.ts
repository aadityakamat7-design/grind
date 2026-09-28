// Versioned Terms of Service acceptance — shared logic used by:
//   - checkTermsAcceptance (frontend gate: should we show the modal?)
//   - acceptTerms (record the user's acceptance)
//   - createBooking / acceptJobPost / decideBooking (server-side gate)
//
// A user has accepted the current Terms if a ConsentRecord exists with
// consent_version = TERMS_VERSION where either:
//   - parent_user_id = user.id  (they accepted for themselves or for their teen), OR
//   - teen_user_id   = user.id  (their parent accepted on their behalf)
//
// This covers all roles:
//   - Neighbors & Independent Teens: self-accept (parent_user_id = their own id)
//   - Parents: self-accept + accept on behalf of each linked teen
//   - Teens under 18: covered by their parent's acceptance (teen_user_id = their id)

export const TERMS_VERSION = '2026-10-01';

// Check whether a user has accepted the current Terms version.
// Uses the service role because ConsentRecord RLS only lets a user read
// records where they are parent_user_id — teens need to match on
// teen_user_id, which requires the service role.
export async function hasAcceptedCurrentTerms(svc, userId: string): Promise<boolean> {
  const records = await svc.ConsentRecord.filter({
    consent_version: TERMS_VERSION,
    $or: [
      { parent_user_id: userId },
      { teen_user_id: userId },
    ],
  }, '-created_date', 1);
  return Array.isArray(records) && records.length > 0;
}

// Record a user's acceptance of the current Terms. Creates a ConsentRecord
// with the version, timestamp, IP, and user agent. For parents, also creates
// a ConsentRecord on behalf of each linked teen so the teen's check passes.
export async function recordTermsAcceptance(svc, base44, opts: {
  userId: string;
  ip: string;
  userAgent: string;
  isParent: boolean;
}): Promise<void> {
  const nowIso = new Date().toISOString();
  const consentEntry = {
    key: 'terms_acceptance',
    label: 'I agree to the Blockwork Terms of Service and Privacy Policy.',
    fullLabel: `I have read and agree to the Blockwork Terms of Service (version ${TERMS_VERSION}) and Privacy Policy, and I accept responsibility for my use of the platform.`,
    accepted: true,
    accepted_at: nowIso,
  };

  // Self-acceptance record (covers neighbors, independent teens, and parents for themselves)
  await svc.ConsentRecord.create({
    parent_user_id: opts.userId,
    teen_user_id: '',
    parent_teen_link_id: '',
    consent_version: TERMS_VERSION,
    consents: [consentEntry],
    state_rules_shown: '',
    state_rules_acknowledged: false,
    teen_state: '',
    ip: opts.ip,
    user_agent: opts.userAgent,
    status: 'active',
  });

  // If the user is a parent, also accept on behalf of each linked teen
  if (opts.isParent) {
    const links = await svc.ParentTeenLink.filter({ parent_user_id: opts.userId, status: 'confirmed' });
    for (const link of links) {
      if (!link.teen_user_id) continue;
      await svc.ConsentRecord.create({
        parent_user_id: opts.userId,
        teen_user_id: link.teen_user_id,
        parent_teen_link_id: link.id,
        consent_version: TERMS_VERSION,
        consents: [{
          ...consentEntry,
          fullLabel: `I have read and agree to the Blockwork Terms of Service (version ${TERMS_VERSION}) and Privacy Policy on behalf of my teen, and I accept responsibility for my teen's use of the platform.`,
        }],
        state_rules_shown: '',
        state_rules_acknowledged: false,
        teen_state: '',
        ip: opts.ip,
        user_agent: opts.userAgent,
        status: 'active',
      });
    }
  }
}