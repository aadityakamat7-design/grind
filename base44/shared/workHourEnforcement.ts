// Server-side enforcement of state child-labor hour limits for minors.
// Used by createBooking and acceptJobPost so a booking that would push a teen
// over their daily/weekly limit, or that falls in a prohibited time window,
// is rejected at the API — not just hidden in the UI. Uses the verified age
// (caller passes getVerifiedAge()), not the self-reported age.
//
// IMPORTANT: all hour/day/season checks interpret the booking time in the
// TEEN'S LOCAL TIMEZONE (derived from their state), not the server's UTC.
// Child-labor laws are based on local clock time where the work happens.
import { getHourLimits, formatHour } from './stateHourLimits.ts';
import {
  getStateTimezone, getLocalHour, getLocalDayOfWeek,
  localStartOfDay, localStartOfWeek,
  isSummerDateLocal, isSchoolDayDateLocal, atLocalHour,
} from './localTime.ts';

const ACTIVE_STATUSES = ['confirmed', 'in_progress', 'completed'];

function nextDay(date: Date): Date {
  return new Date(date.getTime() + 86400000);
}
function nextWeekStart(date: Date, tz: string): Date {
  const ws = localStartOfWeek(date, tz);
  return new Date(ws.getTime() + 7 * 86400000);
}

// Returns { ok: true } or { ok: false, reason, nextEligible }.
// ok=true means the booking is within the teen's hour limits for their state/age.
export async function enforceBookingHours(base44, opts: {
  teenUserId: string;
  state: string | null;
  age: number | null;
  scheduledStart: string | null;
  estimatedHours: number;
}) {
  const { teenUserId, state, age, scheduledStart, estimatedHours } = opts;

  // 18+ are adults — no minor hour limits apply.
  if (age != null && age >= 18) return { ok: true };
  // No scheduled time → can't place it in a day/week window yet; don't block.
  if (!scheduledStart) return { ok: true };

  const tz = getStateTimezone(state);
  const limits = getHourLimits(state, age);
  // Fail closed: unverified states (non-CA) return null — block the booking
  // rather than guessing hour limits.
  if (!limits) {
    return {
      ok: false,
      reason: `Blockwork isn't available in ${state || 'your state'} yet — we're starting in California and expanding soon.`,
    };
  }
  const start = new Date(scheduledStart);
  const hrs = Number(estimatedHours) || 2;
  const end = new Date(start.getTime() + hrs * 3600000);

  const summer = isSummerDateLocal(start, tz);
  const schoolDay = isSchoolDayDateLocal(start, tz);
  const maxDaily = schoolDay ? limits.maxDailyHoursSchoolDay : limits.maxDailyHoursNonSchoolDay;
  const maxWeekly = summer ? limits.maxWeeklyHoursSummer : limits.maxWeeklyHoursSchoolWeek;
  const latestEnd = summer ? limits.latestEndHourSummer : limits.latestEndHour;
  const ageLabel = age != null ? `${age}-year-old` : 'minor';

  const startHour = getLocalHour(start, tz);
  const endHour = getLocalHour(end, tz);
  const sameDay = localStartOfDay(end, tz).getTime() === localStartOfDay(start, tz).getTime();

  // Prohibited time window — too early.
  if (startHour < limits.earliestStartHour) {
    return {
      ok: false,
      reason: `Work can't start before ${formatHour(limits.earliestStartHour)} for a ${ageLabel} in ${state}.`,
      nextEligible: atLocalHour(start, limits.earliestStartHour, tz),
    };
  }
  // Prohibited time window — too late / past midnight.
  if (!sameDay || endHour > latestEnd) {
    return {
      ok: false,
      reason: `Work can't continue past ${formatHour(latestEnd)} for a ${ageLabel} in ${state} on a ${schoolDay ? 'school day' : 'non-school day'}.`,
      nextEligible: atLocalHour(nextDay(start), limits.earliestStartHour, tz),
    };
  }
  // Prohibited during school hours on a school day.
  if (schoolDay && limits.prohibitedDuringSchoolHours && startHour < limits.schoolHoursEnd && endHour > limits.schoolHoursStart) {
    return {
      ok: false,
      reason: `Work can't happen during school hours (${formatHour(limits.schoolHoursStart)}–${formatHour(limits.schoolHoursEnd)}) on a school day in ${state}.`,
      nextEligible: atLocalHour(start, limits.schoolHoursEnd, tz),
    };
  }

  // Sum already-scheduled + completed hours for the booking's day and week.
  const svc = base44.asServiceRole.entities;
  const bookings = await svc.Booking.filter(
    { teen_user_id: teenUserId, status: { $in: ACTIVE_STATUSES } },
    '-created_date',
    200,
  );
  const dayStart = localStartOfDay(start, tz);
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  const weekStart = localStartOfWeek(start, tz);
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
  const hrsOf = (b: any) => Number(b.estimated_hours) || 2;
  const dayHours = bookings
    .filter((b: any) => { const d = new Date(b.scheduled_start); return d >= dayStart && d < dayEnd; })
    .reduce((s: number, b: any) => s + hrsOf(b), 0);
  const weekHours = bookings
    .filter((b: any) => { const d = new Date(b.scheduled_start); return d >= weekStart && d < weekEnd; })
    .reduce((s: number, b: any) => s + hrsOf(b), 0);

  if (dayHours + hrs > maxDaily) {
    return {
      ok: false,
      reason: `This would exceed the ${maxDaily}h daily limit for a ${ageLabel} in ${state} on a ${schoolDay ? 'school day' : 'non-school day'} (${dayHours}h already scheduled that day).`,
      nextEligible: atLocalHour(nextDay(start), limits.earliestStartHour, tz),
    };
  }
  if (weekHours + hrs > maxWeekly) {
    return {
      ok: false,
      reason: `This would exceed the ${maxWeekly}h weekly limit for a ${ageLabel} in ${state} during ${summer ? 'summer' : 'the school year'} (${weekHours}h already scheduled this week).`,
      nextEligible: atLocalHour(nextWeekStart(start, tz), limits.earliestStartHour, tz),
    };
  }

  return { ok: true, dayHours, weekHours, maxDaily, maxWeekly };
}