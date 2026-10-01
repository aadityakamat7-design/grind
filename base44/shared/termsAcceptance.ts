// Versioned Terms of Service acceptance — shared logic used by:
//   - checkTermsAcceptance (does this user need the "Updated Terms" pop-up?)
//   - acceptTerms (record a user's acceptance)
//   - createBooking / acceptJobPost / decideBooking (server-side action gates)
//
// A user has accepted the current Terms if a *Terms* ConsentRecord exists with
// consent_version = TERMS_VERSION where either:
//   - parent_user_id = user.id, with no teen_user_id (they accepted for themselves), OR
//   - teen_user_id   = user.id (their parent accepted on their behalf)
//
// Only records carrying the 'terms_acceptance' consent item count. The
// parental-consent records written when a parent links a teen use a date-shaped
// version too (CONSENT_VERSION is also 2026-10-01), and mistaking one for a
// Terms acceptance is exactly how the gate drifted.

import { getVerifiedAge } from './teenAge.ts';

export const TERMS_VERSION = '2026-10-01';
const TERMS_ITEM_KEY = 'terms_acceptance';

function acceptedTermsVersion(record) {
  const items = Array.isArray(record?.consents) ? record.consents : [];
  return items.some((c) => c && c.key === TERMS_ITEM_KEY) ? record.consent_version : null;
}

function isVersionDate(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function newest(versions) {
  const real = (versions || []).filter(isVersionDate).sort();
  return real.length ? real[real.length - 1] : null;
}

// Split a user's Terms versions into what they accepted themselves and what a
// parent accepted on their behalf.
export function termsVersionsFor(records, userId) {
  const self = [];
  const coveredByParent = [];
  for (const r of records || []) {
    const v = acceptedTermsVersion(r);
    if (!v) continue;
    if (r.teen_user_id === userId) coveredByParent.push(v);
    else if (r.parent_user_id === userId && !r.teen_user_id) self.push(v);
  }
  return { self, coveredByParent };
}

async function termsRecordsFor(svc, userId) {
  // Uses the service role because ConsentRecord RLS only lets a user read
  // records where they are parent_user_id — a teen's coverage is matched on
  // teen_user_id, which needs the service role.
  const records = await svc.ConsentRecord.filter({
    $or: [
      { parent_user_id: userId },
      { teen_user_id: userId },
    ],
  }, '-created_date', 50);
  return Array.isArray(records) ? records : [];
}

export async function hasAcceptedCurrentTerms(svc, userId) {
  const records = await termsRecordsFor(svc, userId);
  const { self, coveredByParent } = termsVersionsFor(records, userId);
  return self.includes(TERMS_VERSION) || coveredByParent.includes(TERMS_VERSION);
}

// A teen under 18 never accepts Terms themselves — their linked parent accepts
// on their behalf. While the parent's acceptance is an older version the teen
// keeps working (the parent is prompted, the teen sees a notice), so the action
// gates use this for a teen actor instead of hasAcceptedCurrentTerms.
export async function hasMinorTermsCoverage(svc, userId) {
  if (await hasAcceptedCurrentTerms(svc, userId)) return true;

  const teenProfiles = await svc.TeenProfile.filter({ user_id: userId });
  if (!teenProfiles[0]) return false;

  const [links, privates] = await Promise.all([
    svc.ParentTeenLink.filter({ teen_user_id: userId, status: 'confirmed' }),
    svc.TeenPrivateData.filter({ user_id: userId }),
  ]);
  if (!links[0] || !links[0].parent_user_id) return false;

  const age = getVerifiedAge(privates[0]);
  if (age != null && age >= 18) return false; // independent 18+ accepts for themselves

  const records = await termsRecordsFor(svc, userId);
  return termsVersionsFor(records, userId).coveredByParent.length > 0;
}

// The server-side answer to "does this user need the Updated Terms pop-up?".
//   - A user with no acceptance on record is a new (or never-recorded) account:
//     the pop-up is not a backup for a missing record, so it stays shut.
//   - A teen under 18 is never shown it: their parent is prompted instead.
export async function resolveTermsReacceptance(svc, user) {
  const records = await termsRecordsFor(svc, user.id);
  const { self, coveredByParent } = termsVersionsFor(records, user.id);

  // Only a ConsentRecord counts. The terms_version stamp on the user record is
  // informational: an account whose acceptance was never recorded is reported,
  // never prompted — the pop-up is not a backup for a missing record.
  const ownVersion = newest(self);
  const coverageVersion = newest(coveredByParent);
  const hasRecord = self.length > 0 || coveredByParent.length > 0;
  const acceptedCurrent = self.includes(TERMS_VERSION) || coveredByParent.includes(TERMS_VERSION);

  const teenProfiles = await svc.TeenProfile.filter({ user_id: user.id });
  const isTeen = Boolean(teenProfiles[0]);

  let isMinor = false;
  if (isTeen) {
    const privates = await svc.TeenPrivateData.filter({ user_id: user.id });
    const age = getVerifiedAge(privates[0]);
    // Under 18 — or an age that isn't verified yet — means a parent accepts
    // for them, so they are never asked to accept themselves.
    isMinor = age == null || age < 18;
  }

  if (isMinor) {
    return {
      needsTermsReacceptance: false,
      // Their parent's acceptance exists but is an older version: a notice, never
      // a pop-up, and never a block.
      teenNotice: hasRecord && !acceptedCurrent,
      isTeen: true,
      canAccept: false,
      termsVersion: TERMS_VERSION,
      acceptedVersion: coverageVersion,
    };
  }

  // They accepted Terms before, just not this version.
  const ownIsStale = self.length > 0 && !self.includes(TERMS_VERSION);

  // A parent also accepts on behalf of a linked teen: a teen needs a *current*
  // acceptance on record to keep working, and their parent is the only one who
  // can give it. So the parent is prompted whenever a linked teen isn't covered
  // by the current version — whether that coverage is older or missing entirely.
  let teenNeedsAcceptance = false;
  if (!isTeen) {
    const links = await svc.ParentTeenLink.filter({ parent_user_id: user.id, status: 'confirmed' });
    for (const link of links) {
      if (!link.teen_user_id) continue;
      const teenRecords = await termsRecordsFor(svc, link.teen_user_id);
      const covered = termsVersionsFor(teenRecords, link.teen_user_id).coveredByParent;
      if (!covered.includes(TERMS_VERSION)) {
        teenNeedsAcceptance = true;
        break;
      }
    }
  }

  return {
    // They accepted a version that isn't the current one, or a linked teen needs
    // them to accept on their behalf.
    needsTermsReacceptance: ownIsStale || teenNeedsAcceptance,
    teenNotice: false,
    isTeen,
    canAccept: true,
    termsVersion: TERMS_VERSION,
    acceptedVersion: ownVersion,
  };
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
    key: TERMS_ITEM_KEY,
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