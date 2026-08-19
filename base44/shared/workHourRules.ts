// Per-state work-hour rules for minors (13-17). 18-19 are adults — no hour limits.
// Mirrors src/lib/stateWorkRules.js (frontend getWorkHourRules). Keep in sync.

const FLSA_14_15 = {
  maxDailyHoursSchoolDay: 3,
  maxWeeklyHoursSchoolWeek: 18,
  maxDailyHoursNonSchoolDay: 8,
  maxWeeklyHoursSummer: 40,
  earliestStartHour: 7,
  latestEndHour: 19,
  latestEndHourSummer: 21,
  prohibitedDuringSchoolHours: true,
  schoolHoursStart: 8,
  schoolHoursEnd: 15,
};

const FLSA_16_17 = {
  maxDailyHoursSchoolDay: 4,
  maxWeeklyHoursSchoolWeek: 20,
  maxDailyHoursNonSchoolDay: 8,
  maxWeeklyHoursSummer: 48,
  earliestStartHour: 5,
  latestEndHour: 22,
  latestEndHourSummer: 23,
  prohibitedDuringSchoolHours: false,
  schoolHoursStart: 8,
  schoolHoursEnd: 15,
};

const RULES_AGE_13 = {
  maxDailyHoursSchoolDay: 3,
  maxWeeklyHoursSchoolWeek: 18,
  maxDailyHoursNonSchoolDay: 8,
  maxWeeklyHoursSummer: 40,
  earliestStartHour: 7,
  latestEndHour: 19,
  latestEndHourSummer: 21,
  prohibitedDuringSchoolHours: true,
  schoolHoursStart: 8,
  schoolHoursEnd: 15,
};

export function getWorkHourRules(age: number | null) {
  if (age == null) return FLSA_14_15;
  if (age >= 18) {
    return {
      maxDailyHoursSchoolDay: 24,
      maxWeeklyHoursSchoolWeek: 60,
      maxDailyHoursNonSchoolDay: 24,
      maxWeeklyHoursSummer: 60,
      earliestStartHour: 0,
      latestEndHour: 24,
      latestEndHourSummer: 24,
      prohibitedDuringSchoolHours: false,
      schoolHoursStart: 8,
      schoolHoursEnd: 15,
    };
  }
  if (age <= 13) return RULES_AGE_13;
  if (age <= 15) return FLSA_14_15;
  return FLSA_16_17;
}