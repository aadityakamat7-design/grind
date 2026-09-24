// ============================================================================
// Per-state, per-category minimum age rules for teen work on Blockwork.
//
// Structure mirrors stateHourLimits.ts — each verified state has source,
// sourceUrl, verifiedDate, and per-category rule metadata.
//
// Blockwork currently operates in California ONLY. All other states are
// unverified and fail CLOSED (CONSERVATIVE_DEFAULT_AGE = 16). Expanding to
// a new state requires adding it here with verified data from that state's
// labor department.
//
// LEGAL FRAMEWORK (California):
//
// 1. "Irregular odd jobs in private homes" exemption — CA DIR Child Labor
//    Law Pamphlet, Summary Charts:
//    "NO PERMITS REQUIRED FOR: ... irregular odd jobs in private homes such
//    as baby-sitting, yardwork, etc."
//    Chapter 3: "Minors irregularly employed in odd jobs in private homes,
//    such as baby-sitting, lawn mowing, and leaf raking, do not need to
//    obtain a Permit to Employ and Work."
//    → This exemption covers ALL Blockwork categories (casual, irregular
//      work in/around private homes). It sets NO minimum age — the platform
//      sets its own minimum of 13 (see checkEligibility in stateWorkRules.js).
//
// 2. Federal Hazardous Occupations Order 5 (29 CFR 570.34) — prohibits
//    minors under 16 from operating power-driven machinery (power mowers,
//    power trimmers, power leaf blowers, etc.).
//    → Enforced SEPARATELY by hazardCheck.ts at the listing/job-post text
//      level, NOT by the category minimum. A 13-year-old can create a
//      lawn_care listing for manual raking; "mower" or "blower" in the
//      title is blocked by hazardCheck for under-16.
//
// 3. Federal HO 1-17 — prohibit hazardous tasks for under-18 (roofing,
//    excavation, power saws, driving, etc.).
//    → Enforced by hazardCheck.ts (blocks for ALL ages).
//
// 4. Car washing / detailing — allowed at 13 (platform minimum) under the
//    odd-jobs exemption. No power-equipment restriction applies to this
//    category.
//
// Source: California DIR Child Labor Law Pamphlet
//   https://www.dir.ca.gov/dlse/ChildLaborLawPamphlet.pdf
// Verified: 2026-09-19
// ============================================================================

export const JOB_CATEGORIES = [
  'tutoring',
  'tech_help',
  'lawn_care',
  'car_washing',
  'odd_jobs',
  'pet_sitting',
] as const;

export type JobCategory = typeof JOB_CATEGORIES[number];

// Fails safe — more restrictive, not permissive. Used for unverified states
// and any unlisted category-state pair.
export const CONSERVATIVE_DEFAULT_AGE = 16;

// Per-category rule metadata — documents the legal basis for each minimum.
export interface CategoryAgeRule {
  minAge: number;
  source: string;
  sourceUrl: string;
  notes: string;
  confirmed: boolean;
}

// California category age rules — three tiers based on risk and equipment.
//
// Tier 1 (13): Online categories — no physical risk, no equipment. Falls
//   under the odd-jobs exemption (no minimum age); platform minimum is 13.
//   Source: CA DIR Pamphlet, Summary Charts (odd-jobs exemption).
//
// Tier 2 (14): Standard outdoor manual categories (pet sitting, car washing,
//   odd jobs) — outdoor physical work with no power equipment. Set to the CA
//   general employment minimum (14) as a conservative policy choice, above
//   the odd-jobs exemption floor. Source: CA DIR Pamphlet, Ch. 3 ("minors
//   must be at least 14 years of age to begin working").
//
// Tier 3 (16): Lawn care — commonly involves power-driven equipment (mowers,
//   trimmers, blowers). Federal 29 CFR 570.34(l) prohibits under-16 from
//   operating power-driven lawn mowers and trimmers. Manual lawn care is
//   legal at 13 under the odd-jobs exemption, but the category minimum is
//   set at 16 because power equipment is the primary activity. hazardCheck.ts
//   also blocks power-equipment keywords for under-16 as a second gate.
//   Source: 29 CFR 570.34(l); CA DIR Pamphlet, Ch. 7.
const CA_CATEGORY_RULES: Record<JobCategory, CategoryAgeRule> = {
  tutoring: {
    minAge: 13,
    source: 'CA DIR Child Labor Law Pamphlet — irregular odd jobs exemption',
    sourceUrl: 'https://www.dir.ca.gov/dlse/ChildLaborLawPamphlet.pdf',
    notes: 'Online tutoring via video. No physical risk, no equipment. Odd-jobs exemption applies (irregular casual work). Platform minimum: 13.',
    confirmed: true,
  },
  tech_help: {
    minAge: 13,
    source: 'CA DIR Child Labor Law Pamphlet — irregular odd jobs exemption',
    sourceUrl: 'https://www.dir.ca.gov/dlse/ChildLaborLawPamphlet.pdf',
    notes: 'Remote tech help via video. No physical risk. Odd-jobs exemption applies. Platform minimum: 13.',
    confirmed: true,
  },
  pet_sitting: {
    minAge: 14,
    source: 'CA DIR Child Labor Law Pamphlet, Ch. 3 — general employment minimum',
    sourceUrl: 'https://www.dir.ca.gov/dlse/ChildLaborLawPamphlet.pdf',
    notes: 'Dog walking / doorstep pet pickup (outdoor, no home entry). Outdoor physical work — set to CA general employment minimum (14) as a conservative policy choice. Odd-jobs exemption allows younger, but 14 is the standard employment floor.',
    confirmed: true,
  },
  car_washing: {
    minAge: 13,
    source: 'CA DIR Child Labor Law Pamphlet — irregular odd jobs exemption',
    sourceUrl: 'https://www.dir.ca.gov/dlse/ChildLaborLawPamphlet.pdf',
    notes: 'Manual car washing and detailing (outdoor, no home entry). Odd-jobs exemption applies (irregular casual work in private homes). Platform minimum: 13.',
    confirmed: true,
  },
  lawn_care: {
    minAge: 16,
    source: '29 CFR 570.34(l) — power-driven lawn mowers and trimmers prohibited under 16',
    sourceUrl: 'https://www.ecfr.gov/current/title-29/subtitle-B/chapter-V/subchapter-A/part-570',
    notes: 'Lawn care commonly involves power mowers/trimmers/blowers. Federal 29 CFR 570.34(l) prohibits under-16 from operating power-driven lawn mowers and trimmers. Manual lawn care is legal at 13 under the odd-jobs exemption, but the category minimum is 16 because power equipment is the primary activity. hazardCheck.ts also blocks power-equipment keywords for under-16.',
    confirmed: true,
  },
  odd_jobs: {
    minAge: 14,
    source: 'CA DIR Child Labor Law Pamphlet, Ch. 3 — general employment minimum',
    sourceUrl: 'https://www.dir.ca.gov/dlse/ChildLaborLawPamphlet.pdf',
    notes: 'Manual outdoor odd jobs (yard cleanup, leaf raking, etc.). Outdoor physical work — set to CA general employment minimum (14). Power equipment gated at 16+ by hazardCheck.ts.',
    confirmed: true,
  },
};

// Verified-state metadata for category age rules. Mirrors VERIFIED_STATES
// in stateHourLimits.ts. Add a state here ONLY after its category minimums
// have been confirmed against the official source.
export const VERIFIED_CATEGORY_STATES: Record<string, {
  verified: boolean;
  source: string;
  sourceUrl: string;
  verifiedDate: string;
  rules: Record<JobCategory, CategoryAgeRule>;
}> = {
  CA: {
    verified: true,
    source: 'California DIR Child Labor Law Pamphlet',
    sourceUrl: 'https://www.dir.ca.gov/dlse/ChildLaborLawPamphlet.pdf',
    verifiedDate: '2026-09-19',
    rules: CA_CATEGORY_RULES,
  },
};

// Backward-compatible flat map: state → category → minAge. Derived from
// VERIFIED_CATEGORY_STATES so there's a single source of truth.
export const CATEGORY_AGES: Record<string, Record<JobCategory, number>> = Object.fromEntries(
  Object.entries(VERIFIED_CATEGORY_STATES).map(([code, entry]) => [
    code,
    Object.fromEntries(
      (Object.entries(entry.rules) as [string, CategoryAgeRule][]).map(([cat, rule]) => [cat, rule.minAge])
    ),
  ])
);

// Returns the full rule (minAge + source + notes) for a state-category pair,
// or null if the state is unverified. Callers that only need the number
// should use getMinAgeForCategory instead.
export function getCategoryRule(
  state: string | undefined,
  category: string
): CategoryAgeRule | null {
  if (!state || !category) return null;
  const code = state.toUpperCase();
  const entry = VERIFIED_CATEGORY_STATES[code];
  if (!entry || !entry.verified) return null;
  return entry.rules[category as JobCategory] || null;
}

export function getMinAgeForCategory(state: string | undefined, category: string): number {
  const rule = getCategoryRule(state, category);
  if (rule) return rule.minAge;
  return CONSERVATIVE_DEFAULT_AGE;
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