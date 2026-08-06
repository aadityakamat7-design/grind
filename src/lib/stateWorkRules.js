// Per-state minimum ages for casual minor work on Kickstart
// (babysitting, tutoring, lawn care, pet sitting, tech help, car washing, odd jobs).
// Casual/domestic work is exempt from many state child-labor rules, so most states
// allow it from 13 (the platform floor). Stricter states are listed at 14.
// NOTE: reference table — have counsel verify before launch in a given state.

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

// Minimum age for casual work per state. Default 13 (casual-work exemption); stricter states 14.
export const STATE_MIN_AGES = {
  AL: 13, AK: 13, AZ: 13, AR: 13, CA: 14, CO: 13, CT: 14, DE: 14, DC: 14,
  FL: 13, GA: 13, HI: 14, ID: 13, IL: 14, IN: 13, IA: 13, KS: 13, KY: 13,
  LA: 13, ME: 14, MD: 14, MA: 14, MI: 14, MN: 14, MS: 13, MO: 14, MT: 13,
  NE: 13, NV: 13, NH: 13, NJ: 14, NM: 13, NY: 14, NC: 13, ND: 14, OH: 14,
  OK: 13, OR: 14, PA: 14, RI: 14, SC: 13, SD: 13, TN: 13, TX: 13, UT: 13,
  VT: 14, VA: 13, WA: 14, WV: 14, WI: 14, WY: 13,
};

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

export function stateName(code) {
  return US_STATES.find((s) => s.code === code)?.name || code;
}

// Returns { status: "eligible" | "blocked" | "invalid", reason, age, minAge, needsParent }
// 18–19 teens use the platform independently (no parent needed).
// 13–17 teens require a linked, verified parent. Under 13 is blocked. 20+ is too old.
export function checkEligibility(dateOfBirth, stateCode) {
  const age = calcAgeFrom(dateOfBirth);
  if (age === null || !stateCode) return { status: "invalid" };
  if (age < 13) return { status: "blocked", reason: "under_13", age, minAge: 13 };
  if (age > 19) return { status: "blocked", reason: "over_19", age, minAge: 19 };
  // 18–19 can join as independent teens — no parent approval required
  if (age >= 18) return { status: "eligible", age, minAge: 18, needsParent: false };
  // 13–17: check state minimum age, parent required
  const minAge = Math.max(13, STATE_MIN_AGES[stateCode] ?? 14);
  if (age < minAge) return { status: "blocked", reason: "under_state_min", age, minAge };
  return { status: "eligible", age, minAge, needsParent: true };
}

export function blockedMessage(result, stateCode) {
  const st = stateName(stateCode);
  if (result.reason === "under_13")
    return "Kickstart is for teens 13 and older. We'd love to have you when you turn 13!";
  if (result.reason === "over_19")
    return "Kickstart is for teens 13–19. Thanks for growing with us!";
  return `In ${st}, teens need to be at least ${result.minAge} to do this kind of work. You're ${result.age} now — you'll be able to join Kickstart when you turn ${result.minAge}.`;
}

// ---------------------------------------------------------------------------
// Per-state, per-category minimum age gating.
// Mirrors base44/shared/categoryAgeRules.ts (server-side). Keep in sync.
// Conservative default for unlisted pairs: 16 (fails safe — more restrictive).
// ---------------------------------------------------------------------------

export const CONSERVATIVE_DEFAULT_AGE = 16;

const TIERS_AGE_13 = {
  tutoring: 13, tech_help: 13, pet_sitting: 13, babysitting: 13,
  lawn_care: 14, car_washing: 13, odd_jobs: 14,
};
const TIERS_AGE_14 = {
  tutoring: 14, tech_help: 14, pet_sitting: 14, babysitting: 14,
  lawn_care: 14, car_washing: 14, odd_jobs: 14,
};
const STATES_AGE_13 = new Set([
  "AL","AK","AZ","AR","CO","FL","GA","ID","IN","IA","KS","KY",
  "LA","MS","MT","NE","NV","NH","NM","NC","OK","SC","SD","TN",
  "TX","UT","VA","WY",
]);
const STATES_AGE_14 = new Set([
  "CA","CT","DE","DC","HI","IL","ME","MD","MA","MI","MN","MO",
  "ND","NJ","NY","OH","OR","PA","RI","VT","WA","WV","WI",
]);
const STATE_CATEGORY_OVERRIDES = {};

function buildCategoryTable() {
  const table = {};
  for (const state of [...STATES_AGE_13, ...STATES_AGE_14]) {
    const base = STATES_AGE_13.has(state) ? TIERS_AGE_13 : TIERS_AGE_14;
    table[state] = { ...base, ...(STATE_CATEGORY_OVERRIDES[state] || {}) };
  }
  return table;
}
export const CATEGORY_AGES = buildCategoryTable();

// State full-name → code lookup, so getMinAgeForCategory works with either
// "CA" or "California" (JobPost stores full names, TeenProfile stores codes).
const STATE_NAME_TO_CODE = US_STATES.reduce((acc, s) => { acc[s.name] = s.code; return acc; }, {});

function normalizeState(state) {
  if (!state) return null;
  const upper = state.toUpperCase();
  if (upper.length === 2 && CATEGORY_AGES[upper]) return upper;
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