// ============================================================================
// Blockwork — California-only compliance layer (frontend mirror).
//
// Blockwork currently operates in California ONLY. Teens, parents, and
// neighbors must be California-based. Non-CA states are blocked at the
// eligibility check with a friendly message and a waitlist option.
//
// Mirrors base44/shared/ for server-side enforcement. Keep in sync.
// ============================================================================

import { getHourLimits } from "./stateHourLimits";

export const US_STATES = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" }, { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" }, { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" }, { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" }, { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" }, { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" }, { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" }, { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" }, { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" }, { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" }, { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" }, { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
];

// Blockwork currently operates in California only.
export const ENABLED_STATES = ["CA"];

export function isStateAvailable(stateCode) {
  if (!stateCode) return false;
  return ENABLED_STATES.includes(stateCode.toUpperCase());
}

// California minimum age for casual minor work.
export const STATE_MIN_AGES = { CA: 14 };

export function calcAgeFrom(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

// Verified age from TeenPrivateData — uses verified_dob (Stripe-verified DOB)
// when available, falling back to self-reported DOB only before verification.
// Mirrors base44/shared/teenAge.ts getVerifiedAge; keep in sync.
export function getVerifiedAgeFromPrivate(privateData) {
  if (!privateData) return null;
  const dob = privateData.verified_dob || privateData.date_of_birth;
  if (!dob) return privateData.age ?? null;
  return calcAgeFrom(dob);
}

export function stateName(code) {
  return US_STATES.find((s) => s.code === code)?.name || code;
}

// Returns { status: "eligible" | "blocked" | "invalid", reason, age, minAge, needsParent }
// 18–19 teens use the platform independently (no parent needed).
// 13–17 teens require a linked, verified parent. Under 13 is blocked. 20+ is too old.
// Non-CA states are blocked with "not available yet" + waitlist option.
export function checkEligibility(dateOfBirth, stateCode) {
  const age = calcAgeFrom(dateOfBirth);
  if (age === null || !stateCode) return { status: "invalid" };
  if (age < 13) return { status: "blocked", reason: "under_13", age, minAge: 13 };
  if (age > 19) return { status: "blocked", reason: "over_19", age, minAge: 19 };
  // CA-only: block non-California states
  if (!isStateAvailable(stateCode)) {
    return { status: "blocked", reason: "state_unavailable", age, state: stateCode };
  }
  // 18–19 can join as independent teens — no parent approval required
  if (age >= 18) return { status: "eligible", age, minAge: 18, needsParent: false };
  // 13–17: check state minimum age, parent required
  const minAge = Math.max(13, STATE_MIN_AGES[stateCode] ?? 14);
  if (age < minAge) return { status: "blocked", reason: "under_state_min", age, minAge };
  return { status: "eligible", age, minAge, needsParent: true };
}

export function blockedMessage(result, stateCode) {
  const st = stateName(stateCode);
  if (result.reason === "state_unavailable")
    return `Blockwork isn't available in ${st} yet — we're starting in California and expanding soon.`;
  if (result.reason === "under_13")
    return "Blockwork is for teens 13 and older. We'd love to have you when you turn 13!";
  if (result.reason === "over_19")
    return "Blockwork is for teens 13–19. Thanks for growing with us!";
  return `In ${st}, teens need to be at least ${result.minAge} to do this kind of work. You're ${result.age} now — you'll be able to join Blockwork when you turn ${result.minAge}.`;
}

// ---------------------------------------------------------------------------
// Per-state, per-category minimum age gating.
// Mirrors base44/shared/categoryAgeRules.ts (server-side). Keep in sync.
// Only California is listed; unlisted states default to 16 (fails safe).
// ---------------------------------------------------------------------------

export const CONSERVATIVE_DEFAULT_AGE = 16;

const CA_CATEGORY_AGES = {
  tutoring: 14, tech_help: 14, pet_sitting: 14,
  lawn_care: 14, car_washing: 14, odd_jobs: 14,
};

export const CATEGORY_AGES = { CA: CA_CATEGORY_AGES };

const STATE_NAME_TO_CODE = US_STATES.reduce((acc, s) => { acc[s.name] = s.code; return acc; }, {});

function normalizeState(state) {
  if (!state) return null;
  const upper = state.toUpperCase();
  if (upper.length === 2) return upper;
  return STATE_NAME_TO_CODE[state] || upper;
}

export function getMinAgeForCategory(stateCode, category) {
  if (!stateCode || !category) return CONSERVATIVE_DEFAULT_AGE;
  const code = normalizeState(stateCode);
  if (!code) return CONSERVATIVE_DEFAULT_AGE;
  const stateTable = CATEGORY_AGES[code.toUpperCase()];
  if (!stateTable) return CONSERVATIVE_DEFAULT_AGE;
  const age = stateTable[category];
  return typeof age === "number" ? age : CONSERVATIVE_DEFAULT_AGE;
}

export function isEligibleForCategory(age, stateCode, category) {
  const minAge = getMinAgeForCategory(stateCode, category);
  if (age == null) {
    return { eligible: false, minAge, reason: "Identity verification required to verify your age." };
  }
  if (age < minAge) {
    return {
      eligible: false,
      minAge,
      reason: `Available at ${minAge}+ in your state — you'll be eligible when you turn ${minAge}.`,
    };
  }
  return { eligible: true, minAge };
}

// ---------------------------------------------------------------------------
// Per-state work-hour rules for minors (13–17).
// 18–19 are adults — no hour restrictions apply.
// Only California is verified; unverified states return null (fail closed).
// ---------------------------------------------------------------------------

export const CONSENT_VERSION = "1.0";

// The 8 itemized consent acknowledgments a parent must check individually.
// Scoped to California — the platform operates in CA only.
export const CONSENT_ITEMS = [
  { key: "identity", label: "I understand I must verify my identity with a government ID before payouts are released to my bank account." },
  { key: "relationship", label: "I confirm I am this teen's parent or legal guardian, and I authorize them to use Blockwork under my supervision." },
  { key: "payment", label: "I authorize Blockwork to process payments on my behalf — holding buyer funds in escrow and transferring payouts to my connected bank account, never directly to my teen." },
  { key: "booking_approval", label: "I understand I must approve or deny every booking request before it is confirmed, and that confirmed bookings cannot be auto-started without my teen's and the buyer's mutual confirmation." },
  { key: "messaging_access", label: "I understand I can read all messages between my teen and buyers at any time, and that Blockwork masks personal contact info (phone, email, address) until a booking is confirmed." },
  { key: "location_safety", label: "I understand that for outdoor jobs, the buyer's address is revealed to my teen only after I approve the booking, and that my teen can trigger a safety alert at any time during a job." },
  { key: "labor_laws", label: "I understand my teen must follow California's child-labor laws, including the hour limits, prohibited work hours, and category minimums shown above — and that Blockwork enforces these hour limits server-side. The casual, irregular odd jobs offered on this platform (light outdoor tasks and online tutoring) are exempt from California's work-permit requirement under the state's odd-jobs exemption, but hour limits, age restrictions, and hazardous-occupation rules still apply and are enforced by the platform. I am responsible for monitoring my teen's overall work hours, including any work outside Blockwork." },
  { key: "revocation", label: "I understand I can revoke my authorization at any time, which immediately pauses my teen's account and flags any in-progress bookings for review." },
];

// Returns hour rules for a teen's state and age, or null if the state is
// unverified (fail closed). 18+ = NO_LIMITS.
export function getWorkHourRules(stateCode, age) {
  return getHourLimits(stateCode, age);
}

// June 1 – Labor Day is considered "summer" for hour-rule purposes.
export function isSummerDate(date = new Date()) {
  const d = new Date(date);
  const month = d.getMonth();
  const day = d.getDate();
  const afterJune1 = month > 5 || (month === 5 && day >= 1);
  const beforeLaborDay = month < 8 || (month === 8 && day <= 1);
  return afterJune1 && beforeLaborDay;
}

// Monday–Friday, excluding a rough summer window.
export function isSchoolDayDate(date = new Date()) {
  if (isSummerDate(date)) return false;
  const day = new Date(date).getDay();
  return day >= 1 && day <= 5;
}

export { formatHour } from "./stateHourLimits";