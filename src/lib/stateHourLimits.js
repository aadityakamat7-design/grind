// ============================================================================
// Per-state work-hour limits for minors (14–17). 18+ have no hour limits.
// This is the AUTHORITATIVE maintained lookup table — values come from here,
// never generated at runtime. Mirrors base44/shared/stateHourLimits.ts (server);
// keep the two in sync.
//
// HOW TO POPULATE FROM OFFICIAL SOURCES:
// Each state below defaults to the conservative federal baseline
// (CONSERVATIVE_HOUR_DEFAULT for 14–15, HOURLY_16_17_BASELINE for 16–17).
// To add a state-specific rule, replace the spread with the official numbers
// from that state's labor department and set `source` to the publication you
// verified against. Until a state is verified, the conservative default
// applies — unlisted states always fail SAFE (more restrictive), never
// permissive.
//
// Fields:
//   maxDailyHoursSchoolDay   – max hours on a school day
//   maxDailyHoursNonSchoolDay – max hours on a non-school day (weekend/holiday)
//   maxWeeklyHoursSchoolWeek  – max hours in a school-week
//   maxWeeklyHoursSummer      – max hours in a summer/non-school week
//   earliestStartHour         – earliest permitted start (24h clock)
//   latestEndHour              – latest permitted end on a school night (24h)
//   latestEndHourSummer        – latest permitted end in summer (24h)
//   prohibitedDuringSchoolHours – ban work during school hours on school days
//   schoolHoursStart / schoolHoursEnd – the school-hours window (24h)
// ============================================================================

export const CONSERVATIVE_HOUR_DEFAULT = {
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
};

export const HOURLY_16_17_BASELINE = {
  maxDailyHoursSchoolDay: 4,
  maxDailyHoursNonSchoolDay: 8,
  maxWeeklyHoursSchoolWeek: 20,
  maxWeeklyHoursSummer: 48,
  earliestStartHour: 5,
  latestEndHour: 22,
  latestEndHourSummer: 23,
  prohibitedDuringSchoolHours: false,
  schoolHoursStart: 8,
  schoolHoursEnd: 15,
};

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

export const STATE_HOUR_LIMITS = {
  AL: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Alabama DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Alabama DOL" } },
  AK: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Alaska DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Alaska DOL" } },
  AZ: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Arizona DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Arizona DOL" } },
  AR: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Arkansas DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Arkansas DOL" } },
  CA: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: CA DLSE" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: CA DLSE" } },
  CO: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Colorado DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Colorado DOL" } },
  CT: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Connecticut DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Connecticut DOL" } },
  DE: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Delaware DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Delaware DOL" } },
  DC: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: DC DOES" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: DC DOES" } },
  FL: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Florida DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Florida DOL" } },
  GA: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Georgia DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Georgia DOL" } },
  HI: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Hawaii DLIR" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Hawaii DLIR" } },
  ID: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Idaho DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Idaho DOL" } },
  IL: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Illinois DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Illinois DOL" } },
  IN: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Indiana DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Indiana DOL" } },
  IA: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Iowa DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Iowa DOL" } },
  KS: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Kansas DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Kansas DOL" } },
  KY: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Kentucky DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Kentucky DOL" } },
  LA: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Louisiana DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Louisiana DOL" } },
  ME: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Maine DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Maine DOL" } },
  MD: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Maryland DLLR" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Maryland DLLR" } },
  MA: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Massachusetts AGO" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Massachusetts AGO" } },
  MI: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Michigan DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Michigan DOL" } },
  MN: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Minnesota DLI" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Minnesota DLI" } },
  MS: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Mississippi DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Mississippi DOL" } },
  MO: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Missouri DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Missouri DOL" } },
  MT: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Montana DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Montana DOL" } },
  NE: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Nebraska DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Nebraska DOL" } },
  NV: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Nevada DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Nevada DOL" } },
  NH: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: New Hampshire DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: New Hampshire DOL" } },
  NJ: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: New Jersey DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: New Jersey DOL" } },
  NM: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: New Mexico DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: New Mexico DOL" } },
  NY: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: NY DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: NY DOL" } },
  NC: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: North Carolina DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: North Carolina DOL" } },
  ND: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: North Dakota DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: North Dakota DOL" } },
  OH: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Ohio DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Ohio DOL" } },
  OK: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Oklahoma DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Oklahoma DOL" } },
  OR: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Oregon BOLI" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Oregon BOLI" } },
  PA: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Pennsylvania DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Pennsylvania DOL" } },
  RI: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Rhode Island DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Rhode Island DOL" } },
  SC: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: South Carolina DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: South Carolina DOL" } },
  SD: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: South Dakota DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: South Dakota DOL" } },
  TN: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Tennessee DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Tennessee DOL" } },
  TX: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Texas DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Texas DOL" } },
  UT: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Utah DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Utah DOL" } },
  VT: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Vermont DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Vermont DOL" } },
  VA: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Virginia DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Virginia DOL" } },
  WA: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Washington DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Washington DOL" } },
  WV: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: West Virginia DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: West Virginia DOL" } },
  WI: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Wisconsin DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Wisconsin DOL" } },
  WY: { "14_15": { ...CONSERVATIVE_HOUR_DEFAULT, source: "TODO: Wyoming DOL" }, "16_17": { ...HOURLY_16_17_BASELINE, source: "TODO: Wyoming DOL" } },
};

// Returns the hour-limit band for a teen's state and age.
// 18+ → NO_LIMITS. age null → CONSERVATIVE_HOUR_DEFAULT (fail safe).
// 13–15 → the state's 14_15 band (conservative default if unlisted).
// 16–17 → the state's 16_17 band (16/17 baseline if unlisted).
export function getHourLimits(stateCode, age) {
  if (age == null) return CONSERVATIVE_HOUR_DEFAULT;
  if (age >= 18) return NO_LIMITS;
  const band = age <= 15 ? "14_15" : "16_17";
  const entry = STATE_HOUR_LIMITS[(stateCode || "").toUpperCase()];
  if (!entry) return band === "14_15" ? CONSERVATIVE_HOUR_DEFAULT : HOURLY_16_17_BASELINE;
  return entry[band] || (band === "14_15" ? CONSERVATIVE_HOUR_DEFAULT : HOURLY_16_17_BASELINE);
}