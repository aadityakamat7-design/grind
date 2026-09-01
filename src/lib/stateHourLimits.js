// ============================================================================
// California-only verified child-labor hour limits for minors.
// Mirrors base44/shared/stateHourLimits.ts (server); keep the two in sync.
//
// Blockwork currently operates in California ONLY. All other states are
// unverified and fail CLOSED — getHourLimits returns null, and the caller
// blocks signup rather than guessing. Expanding to a new state requires
// adding it to VERIFIED_STATES with data confirmed against the official
// state labor-code source.
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

const CA_LIMITS = {
  "14_15": {
    maxDailyHoursSchoolDay: 3,
    maxDailyHoursNonSchoolDay: 8,
    maxWeeklyHoursSchoolWeek: 18,
    maxWeeklyHoursSummer: 40,
    earliestStartHour: 7,
    latestEndHour: 19,
    latestEndHourSummer: 21,
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
    latestEndHour: 22,
    latestEndHourSummer: 22,
    prohibitedDuringSchoolHours: false,
    schoolHoursStart: 8,
    schoolHoursEnd: 15,
  },
};

export const VERIFIED_STATES = {
  CA: {
    verified: true,
    source: "California DIR Child Labor Law Pamphlet",
    sourceUrl: "https://www.dir.ca.gov/dlse/ChildLaborLawPamphlet.pdf",
    verifiedDate: "2026-09-01",
    limits: CA_LIMITS,
  },
};

export function isStateVerified(stateCode) {
  if (!stateCode) return false;
  const entry = VERIFIED_STATES[stateCode.toUpperCase()];
  return !!entry?.verified;
}

// Returns the hour-limit band for a teen's state and age, or null if the
// state is unverified (fail closed — caller must block, never guess).
// 18+ → NO_LIMITS. age null → null (fail closed).
export function getHourLimits(stateCode, age) {
  if (age != null && age >= 18) return NO_LIMITS;
  if (age == null) return null;
  const entry = VERIFIED_STATES[(stateCode || "").toUpperCase()];
  if (!entry || !entry.verified) return null;
  const band = age <= 15 ? "14_15" : "16_17";
  return entry.limits[band] || null;
}

export function formatHour(hour) {
  if (hour == null) return "—";
  const h = Math.floor(hour);
  const suffix = h >= 12 ? "pm" : "am";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}${suffix}`;
}

export function isSummerDate(date = new Date()) {
  const d = new Date(date);
  const month = d.getMonth();
  const day = d.getDate();
  const afterJune1 = month > 5 || (month === 5 && day >= 1);
  const beforeLaborDay = month < 8 || (month === 8 && day <= 1);
  return afterJune1 && beforeLaborDay;
}

export function isSchoolDayDate(date = new Date()) {
  if (isSummerDate(date)) return false;
  const day = new Date(date).getDay();
  return day >= 1 && day <= 5;
}