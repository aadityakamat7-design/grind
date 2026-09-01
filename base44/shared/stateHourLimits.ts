// ============================================================================
// California-only verified child-labor hour limits for minors.
//
// Blockwork currently operates in California ONLY. All other states are
// unverified (verified: false) and fail CLOSED — signup is blocked, not
// guessed. Expanding to a new state requires adding it to VERIFIED_STATES
// below with data confirmed against that state's official labor-code source.
//
// Source: California DIR Child Labor Law Pamphlet
//   https://www.dir.ca.gov/dlse/ChildLaborLawPamphlet.pdf
// Verified: 2026-09-01
// ============================================================================

export const NO_LIMITS = {
  maxDailyHoursSchoolDay: 24,
  maxDailyHoursNonSchoolDay: 24,
  maxWeeklyHoursSchoolWeek: 60,
  maxWeeklyHoursSummer: 60,
  earliestStartHour: 0,
  latestEndHour: 24,
  latestEndHourSummer: 24,
  prohibitedDuringSchoolHours: false,
  schoolHoursStart: 8,
  schoolHoursEnd: 15,
};

// California verified hour limits for 14–15 and 16–17 year olds.
// Source: California DIR Child Labor Law Pamphlet (dir.ca.gov/dlse)
const CA_LIMITS = {
  "14_15": {
    maxDailyHoursSchoolDay: 3,
    maxDailyHoursNonSchoolDay: 8,
    maxWeeklyHoursSchoolWeek: 18,
    maxWeeklyHoursSummer: 40,
    earliestStartHour: 7,
    latestEndHour: 19,   // 7pm on school nights
    latestEndHourSummer: 21, // 9pm in summer
    prohibitedDuringSchoolHours: true,
    schoolHoursStart: 8,
    schoolHoursEnd: 15,
  },
  "16_17": {
    maxDailyHoursSchoolDay: 4,
    maxDailyHoursNonSchoolDay: 8,
    maxWeeklyHoursSchoolWeek: 48,
    maxWeeklyHoursSummer: 48,
    earliestStartHour: 5,
    latestEndHour: 22,   // 10pm (CA allows 12:30am on non-school nights; 10pm is conservative)
    latestEndHourSummer: 22,
    prohibitedDuringSchoolHours: false,
    schoolHoursStart: 8,
    schoolHoursEnd: 15,
  },
};

// Verified-state metadata. Add a state here ONLY after its hour limits have
// been confirmed against the official source. `verified: false` means the
// state is blocked — getHourLimits returns null (fail closed).
export const VERIFIED_STATES: Record<string, {
  verified: boolean;
  source: string;
  sourceUrl: string;
  verifiedDate: string;
  limits: Record<string, any>;
}> = {
  CA: {
    verified: true,
    source: "California DIR Child Labor Law Pamphlet",
    sourceUrl: "https://www.dir.ca.gov/dlse/ChildLaborLawPamphlet.pdf",
    verifiedDate: "2026-09-01",
    limits: CA_LIMITS,
  },
};

export function isStateVerified(stateCode: string | null): boolean {
  if (!stateCode) return false;
  const entry = VERIFIED_STATES[(stateCode as string).toUpperCase()];
  return !!entry?.verified;
}

// Returns the hour-limit band for a teen's state and age, or null if the
// state is unverified (fail closed — caller must block, never guess).
// 18+ → NO_LIMITS. age null → null (fail closed — don't guess).
export function getHourLimits(stateCode: string | null, age: number | null) {
  if (age != null && age >= 18) return NO_LIMITS;
  if (age == null) return null; // fail closed — don't guess
  const entry = VERIFIED_STATES[(stateCode || "").toUpperCase()];
  if (!entry || !entry.verified) return null; // unverified state — fail closed
  const band = age <= 15 ? "14_15" : "16_17";
  return entry.limits[band] || null;
}

export function formatHour(hour: number): string {
  if (hour == null) return "—";
  const h = Math.floor(hour);
  const suffix = h >= 12 ? "pm" : "am";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}${suffix}`;
}

// June 1 – Labor Day is "summer" for hour-rule purposes.
export function isSummerDate(date: Date): boolean {
  const m = date.getMonth();
  const d = date.getDate();
  const afterJune1 = m > 5 || (m === 5 && d >= 1);
  const beforeLaborDay = m < 8 || (m === 8 && d <= 1);
  return afterJune1 && beforeLaborDay;
}

export function isSchoolDayDate(date: Date): boolean {
  if (isSummerDate(date)) return false;
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}