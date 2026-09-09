import { isSchoolDayDate, isSummerDate } from "./stateHourLimits";

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon–Sun

function formatHourLabel(h) {
  const suffix = h >= 12 ? "pm" : "am";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}${suffix}`;
}

function makeSlot(h) {
  return { hour: h, label: formatHourLabel(h), value: `${String(h).padStart(2, "0")}:00` };
}

// Most restrictive CA limits (14-15 year olds) — used when the specific
// teen isn't known yet (e.g. neighbor posting a general job post).
export const MOST_RESTRICTIVE_LIMITS = {
  earliestStartHour: 7,
  latestEndHour: 19,
  latestEndHourSummer: 21,
  prohibitedDuringSchoolHours: true,
  schoolHoursStart: 8,
  schoolHoursEnd: 15,
};

const FALLBACK_LIMITS = {
  earliestStartHour: 7,
  latestEndHour: 19,
  latestEndHourSummer: 21,
  prohibitedDuringSchoolHours: true,
  schoolHoursStart: 8,
  schoolHoursEnd: 15,
};

// Legal hourly slots for a specific calendar date (considers school day vs summer)
export function getLegalSlotsForDate(date, hourLimits) {
  if (!date) return [];
  const limits = hourLimits || FALLBACK_LIMITS;
  const schoolDay = isSchoolDayDate(date);
  const summer = isSummerDate(date);
  const earliest = Math.floor(limits.earliestStartHour ?? 0);
  const latest = Math.floor(summer ? (limits.latestEndHourSummer ?? 24) : (limits.latestEndHour ?? 24));
  const isAdult = (limits.latestEndHour ?? 0) >= 24;
  const slots = [];
  for (let h = earliest; h < latest; h++) {
    if (schoolDay && !isAdult && h >= 8 && h < 15) continue;
    slots.push(makeSlot(h));
  }
  return slots;
}

// Legal hourly slots for a recurring day-of-week (most restrictive: non-summer)
export function getLegalSlotsForDayOfWeek(dayOfWeek, hourLimits) {
  const limits = hourLimits || FALLBACK_LIMITS;
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const earliest = Math.floor(limits.earliestStartHour ?? 0);
  const latest = Math.floor(limits.latestEndHour ?? 24);
  const isAdult = (limits.latestEndHour ?? 0) >= 24;
  const slots = [];
  for (let h = earliest; h < latest; h++) {
    if (isWeekday && !isAdult && h >= 8 && h < 15) continue;
    slots.push(makeSlot(h));
  }
  return slots;
}

export function getAvailabilitySlotForDate(date, availability) {
  if (!availability || availability.length === 0) return null;
  const day = date.getDay();
  return availability.find((a) => a.day === day) || null;
}