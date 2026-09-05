// Per-state, per-category minimum age rules for teen work on Blockwork.
//
// Blockwork currently operates in California ONLY. Only CA is listed here;
// all other states are blocked at signup. Expanding to a new state requires
// adding it here with verified data from that state's labor department.
//
// Tier 1 (online):     tutoring, tech_help — remote video, lowest threshold.
// Tier 2 (outdoor):    lawn_care, car_washing, odd_jobs, pet_sitting —
//                     manual outdoor work (dog walking = doorstep pickup only).
//
// In-home categories (babysitting, childcare, house cleaning, elder care) are
// REMOVED from the platform — teens never enter a client's home.
//
// Hazardous tasks (power equipment, ladders, chemicals) are handled separately
// by hazardCheck.ts and are NOT gated by category alone.
//
// CONSERVATIVE DEFAULT: any unlisted state-category pair defaults to 16
// (fails safe — more restrictive, not permissive). Since non-CA states are
// blocked at signup, this default is a backstop only.

export const JOB_CATEGORIES = [
  'tutoring',
  'tech_help',
  'lawn_care',
  'car_washing',
  'odd_jobs',
  'pet_sitting',
] as const;

export type JobCategory = typeof JOB_CATEGORIES[number];

export const CONSERVATIVE_DEFAULT_AGE = 16;

// California category minimum ages. CA allows 13 for casual minor odd jobs.
const CA_CATEGORY_AGES: Record<JobCategory, number> = {
  tutoring: 13,
  tech_help: 13,
  pet_sitting: 13,
  lawn_care: 13,
  car_washing: 13,
  odd_jobs: 13,
};

// Only California is enabled. Adding a state here requires verified data.
export const CATEGORY_AGES: Record<string, Record<JobCategory, number>> = {
  CA: CA_CATEGORY_AGES,
};

export function getMinAgeForCategory(state: string | undefined, category: string): number {
  if (!state || !category) return CONSERVATIVE_DEFAULT_AGE;
  const code = state.toUpperCase();
  const stateTable = CATEGORY_AGES[code];
  if (!stateTable) return CONSERVATIVE_DEFAULT_AGE;
  const age = stateTable[category as JobCategory];
  if (typeof age !== 'number') return CONSERVATIVE_DEFAULT_AGE;
  return age;
}

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