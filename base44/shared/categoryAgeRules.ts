// Per-state, per-category minimum age rules for teen work on Kickstart.
//
// This is a maintained lookup table — not computed at runtime — mapping each
// US state to the minimum age a teen must be to create a listing or accept a
// job in each category. It is auditable and correctable.
//
// Tier 1 (light indoor): tutoring, tech_help, pet_sitting — lowest threshold.
// Tier 2 (childcare):    babysitting — slightly higher in most states.
// Tier 3 (outdoor):      lawn_care, car_washing, odd_jobs — manual outdoor work.
//
// Hazardous tasks (power equipment, ladders, chemicals) are handled separately
// by hazardCheck.ts and are NOT gated by category alone — the hazard screening
// catches those keywords regardless of category.
//
// CONSERVATIVE DEFAULT: any state-category pair not explicitly listed defaults
// to 16 (fails safe — more restrictive, not permissive). All 50 states + DC are
// explicitly listed below, so the default only triggers for an unknown category
// or a future category not yet added to the table.

export const JOB_CATEGORIES = [
  'tutoring',
  'lawn_care',
  'pet_sitting',
  'tech_help',
  'babysitting',
  'car_washing',
  'odd_jobs',
] as const;

export type JobCategory = typeof JOB_CATEGORIES[number];

// Conservative fallback for any unlisted state-category pair.
export const CONSERVATIVE_DEFAULT_AGE = 16;

// State full-name → code lookup, so getMinAgeForCategory works with either
// "CA" or "California" (JobPost stores full names, TeenProfile stores codes).
const STATE_NAME_TO_CODE: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', 'District of Columbia': 'DC',
  Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL',
  Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA',
  Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN',
  Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK',
  Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT',
  Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY',
};

function normalizeState(state: string | undefined): string | undefined {
  if (!state) return undefined;
  const upper = state.toUpperCase();
  if (upper.length === 2 && CATEGORY_AGES[upper]) return upper;
  return STATE_NAME_TO_CODE[state] || upper;
}

// States where casual work is allowed from age 13 (casual-work exemption).
// All categories follow the tier defaults below.
const STATES_AGE_13 = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CO', 'FL', 'GA', 'ID', 'IN', 'IA', 'KS', 'KY',
  'LA', 'MS', 'MT', 'NE', 'NV', 'NH', 'NM', 'NC', 'OK', 'SC', 'SD', 'TN',
  'TX', 'UT', 'VA', 'WY',
]);

// States with a stricter minimum (14) for all casual minor work.
const STATES_AGE_14 = new Set([
  'CA', 'CT', 'DE', 'DC', 'HI', 'IL', 'ME', 'MD', 'MA', 'MI', 'MN', 'MO',
  'ND', 'NJ', 'NY', 'OH', 'OR', 'PA', 'RI', 'VT', 'WA', 'WV', 'WI',
]);

// Tier defaults for states where casual work starts at 13.
const TIERS_AGE_13: Record<JobCategory, number> = {
  tutoring: 13,
  tech_help: 13,
  pet_sitting: 13,
  babysitting: 13,
  lawn_care: 14,
  car_washing: 13,
  odd_jobs: 14,
};

// Tier defaults for states where all casual work starts at 14.
const TIERS_AGE_14: Record<JobCategory, number> = {
  tutoring: 14,
  tech_help: 14,
  pet_sitting: 14,
  babysitting: 14,
  lawn_care: 14,
  car_washing: 14,
  odd_jobs: 14,
};

// Explicit per-state overrides for categories that differ from the state's
// tier defaults. Add entries here when a specific state has a category-specific
// rule (e.g. babysitting requires 15 in some states).
const STATE_CATEGORY_OVERRIDES: Record<string, Partial<Record<JobCategory, number>>> = {
  // Illinois: babysitting requires 14 (already covered by TIERS_AGE_14).
  // Add state-specific overrides here as they are verified by counsel.
};

// Build the full lookup table at module load — explicit, auditable, and
// correctable. Each state maps to a { category: minAge } object.
function buildTable(): Record<string, Record<JobCategory, number>> {
  const table: Record<string, Record<JobCategory, number>> = {};
  const allStates = [...STATES_AGE_13, ...STATES_AGE_14];
  for (const state of allStates) {
    const base = STATES_AGE_13.has(state) ? TIERS_AGE_13 : TIERS_AGE_14;
    const overrides = STATE_CATEGORY_OVERRIDES[state] || {};
    table[state] = { ...base, ...overrides };
  }
  return table;
}

export const CATEGORY_AGES: Record<string, Record<JobCategory, number>> = buildTable();

// Returns the minimum age for a given category in a given state.
// Falls back to CONSERVATIVE_DEFAULT_AGE (16) for unknown state/category pairs
// so the system fails safe (more restrictive) rather than permissive.
export function getMinAgeForCategory(state: string | undefined, category: string): number {
  if (!state || !category) return CONSERVATIVE_DEFAULT_AGE;
  const code = normalizeState(state);
  if (!code) return CONSERVATIVE_DEFAULT_AGE;
  const stateTable = CATEGORY_AGES[code.toUpperCase()];
  if (!stateTable) return CONSERVATIVE_DEFAULT_AGE;
  const age = stateTable[category as JobCategory];
  if (typeof age !== 'number') return CONSERVATIVE_DEFAULT_AGE;
  return age;
}

// Returns true if the teen is old enough for the category in their state.
export function isEligibleForCategory(
  age: number | null,
  state: string | undefined,
  category: string
): { eligible: boolean; minAge: number; reason?: string } {
  const minAge = getMinAgeForCategory(state, category);
  if (age == null) {
    return { eligible: false, minAge, reason: 'Identity verification required to verify your age.' };
  }
  if (age < minAge) {
    return {
      eligible: false,
      minAge,
      reason: `This category requires age ${minAge}+ in your state. You'll be eligible when you turn ${minAge}.`,
    };
  }
  return { eligible: true, minAge };
}