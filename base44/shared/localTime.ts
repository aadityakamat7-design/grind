// Timezone-aware local-time helpers for child-labor hour enforcement.
//
// Booking times are stored as UTC ISO strings, but child-labor laws are based
// on the LOCAL time where the work happens. The Base44 backend runs in UTC, so
// naive Date.getHours() / getDay() interpret times in UTC — a 5pm Pacific
// booking reads as midnight UTC (hour 0) and wrongly trips the "can't work
// before 7am" rule. These helpers interpret an instant in the teen's state
// timezone so hour/day/season checks match the law.

// US state → IANA timezone. Split-timezone states use the zone covering most
// of the population (sufficient for hour-of-day compliance; the teen's exact
// lat/lng would be needed for edge cases in the panhandle counties).
const STATE_TIMEZONE: Record<string, string> = {
  AL: 'America/Chicago', AK: 'America/Anchorage', AZ: 'America/Phoenix',
  AR: 'America/Chicago', CA: 'America/Los_Angeles', CO: 'America/Denver',
  CT: 'America/New_York', DE: 'America/New_York', DC: 'America/New_York',
  FL: 'America/New_York', GA: 'America/New_York', HI: 'Pacific/Honolulu',
  ID: 'America/Boise', IL: 'America/Chicago', IN: 'America/Indiana/Indianapolis',
  IA: 'America/Chicago', KS: 'America/Chicago', KY: 'America/New_York',
  LA: 'America/Chicago', ME: 'America/New_York', MD: 'America/New_York',
  MA: 'America/New_York', MI: 'America/Detroit', MN: 'America/Chicago',
  MS: 'America/Chicago', MO: 'America/Chicago', MT: 'America/Denver',
  NE: 'America/Chicago', NV: 'America/Los_Angeles', NH: 'America/New_York',
  NJ: 'America/New_York', NM: 'America/Denver', NY: 'America/New_York',
  NC: 'America/New_York', ND: 'America/Chicago', OH: 'America/New_York',
  OK: 'America/Chicago', OR: 'America/Los_Angeles', PA: 'America/New_York',
  RI: 'America/New_York', SC: 'America/New_York', SD: 'America/Chicago',
  TN: 'America/Chicago', TX: 'America/Chicago', UT: 'America/Denver',
  VT: 'America/New_York', VA: 'America/New_York', WA: 'America/Los_Angeles',
  WV: 'America/New_York', WI: 'America/Chicago', WY: 'America/Denver',
};

export function getStateTimezone(state: string | null): string {
  return STATE_TIMEZONE[(state || '').toUpperCase()] || 'America/New_York';
}

// Parse the parts of an instant in the target timezone into a usable map.
function getParts(date: Date, tz: string, opts: Intl.DateTimeFormatOptions) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, ...opts }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return map;
}

// Local hour as a float (e.g. 17.5 = 5:30pm) in the target timezone.
export function getLocalHour(date: Date, tz: string): number {
  const m = getParts(date, tz, { hour: '2-digit', minute: '2-digit', hour12: false });
  const h = Number(m.hour) === 24 ? 0 : Number(m.hour);
  return h + Number(m.minute) / 60;
}

// Local day-of-week (0=Sunday … 6=Saturday) in the target timezone.
export function getLocalDayOfWeek(date: Date, tz: string): number {
  const m = getParts(date, tz, { year: 'numeric', month: '2-digit', day: '2-digit' });
  return new Date(Date.UTC(Number(m.year), Number(m.month) - 1, Number(m.day))).getDay();
}

// UTC instant of local midnight for the given date's local day.
// (DST never transitions at midnight, so subtracting the time-of-day is safe.)
export function localStartOfDay(date: Date, tz: string): Date {
  const m = getParts(date, tz, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const h = Number(m.hour) === 24 ? 0 : Number(m.hour);
  const timeOfDayMs = (h * 3600 + Number(m.minute) * 60 + Number(m.second)) * 1000;
  return new Date(date.getTime() - timeOfDayMs);
}

// UTC instant of local Monday 00:00 for the week containing the given date.
export function localStartOfWeek(date: Date, tz: string): Date {
  const dayStart = localStartOfDay(date, tz);
  const dow = getLocalDayOfWeek(date, tz);
  const diff = dow === 0 ? -6 : 1 - dow; // days back to Monday
  return new Date(dayStart.getTime() + diff * 86400000);
}

// June 1 – Labor Day (Sep 1) is "summer" for hour-rule purposes, in local time.
export function isSummerDateLocal(date: Date, tz: string): boolean {
  const m = getParts(date, tz, { month: '2-digit', day: '2-digit' });
  const mo = Number(m.month), d = Number(m.day); // 1-indexed
  const afterJune1 = mo > 6 || (mo === 6 && d >= 1);
  const beforeLaborDay = mo < 9 || (mo === 9 && d <= 1);
  return afterJune1 && beforeLaborDay;
}

// Mon–Fri during the school year (not summer), in local time.
export function isSchoolDayDateLocal(date: Date, tz: string): boolean {
  if (isSummerDateLocal(date, tz)) return false;
  const dow = getLocalDayOfWeek(date, tz);
  return dow >= 1 && dow <= 5;
}

// ISO string for a specific local hour on the same local calendar day.
export function atLocalHour(date: Date, hour: number, tz: string): string {
  const m = getParts(date, tz, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const h = Number(m.hour) === 24 ? 0 : Number(m.hour);
  const timeOfDayMs = (h * 3600 + Number(m.minute) * 60 + Number(m.second)) * 1000;
  const targetMs = Math.floor(hour) * 3600000;
  return new Date(date.getTime() - timeOfDayMs + targetMs).toISOString();
}