// Server-side enforcement of state child-labor hour limits for minors.
// Used by createBooking and acceptJobPost so a booking that would push a teen
// over their daily/weekly limit, or that falls in a prohibited time window,
// is rejected at the API — not just hidden in the UI. Uses the verified age
// (caller passes getVerifiedAge()), not the self-reported age.
import { getHourLimits, formatHour, isSummerDate, isSchoolDayDate, startOfWeek, startOfDay } from './stateHourLimits.ts';

const ACTIVE_STATUSES = ['confirmed', 'in_progress', 'completed'];

function atHour(date: Date, hour: number): string {
  const d = new Date(date);
  d.setHours(Math.floor(hour), 0, 0, 0);
  return d.toISOString();
}
function nextDay(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return d;
}
function nextWeekStart(date: Date): Date {
  const ws = startOfWeek(date);
  ws.setDate(ws.getDate() + 7);
  return ws;
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

  const limits = getHourLimits(state, age);
  const start = new Date(scheduledStart);
  const hrs = Number(estimatedHours) || 2;
  const end = new Date(start.getTime() + hrs * 3600000);

  const summer = isSummerDate(start);
  const schoolDay = isSchoolDayDate(start);
  const maxDaily = schoolDay ? limits.maxDailyHoursSchoolDay : limits.maxDailyHoursNonSchoolDay;
  const maxWeekly = summer ? limits.maxWeeklyHoursSummer : limits.maxWeeklyHoursSchoolWeek;
  const latestEnd = summer ? limits.latestEndHourSummer : limits.latestEndHour;
  const ageLabel = age != null ? `${age}-year-old` : 'minor';

  const startHour = start.getHours() + start.getMinutes() / 60;
  const endHour = end.getHours() + end.getMinutes() / 60;
  const sameDay = end.toDateString() === start.toDateString();

  // Prohibited time window — too early.
  if (startHour < limits.earliestStartHour) {
    return {
      ok: false,
      reason: `Work can't start before ${formatHour(limits.earliestStartHour)} for a ${ageLabel} in ${state}.`,
      nextEligible: atHour(start, limits.earliestStartHour),
    };
  }
  // Prohibited time window — too late / past midnight.
  if (!sameDay || endHour > latestEnd) {
    return {
      ok: false,
      reason: `Work can't continue past ${formatHour(latestEnd)} for a ${ageLabel} in ${state} on a ${schoolDay ? 'school day' : 'non-school day'}.`,
      nextEligible: atHour(nextDay(start), limits.earliestStartHour),
    };
  }
  // Prohibited during school hours on a school day.
  if (schoolDay && limits.prohibitedDuringSchoolHours && startHour < limits.schoolHoursEnd && endHour > limits.schoolHoursStart) {
    return {
      ok: false,
      reason: `Work can't happen during school hours (${formatHour(limits.schoolHoursStart)}–${formatHour(limits.schoolHoursEnd)}) on a school day in ${state}.`,
      nextEligible: atHour(start, limits.schoolHoursEnd),
    };
  }

  // Sum already-scheduled + completed hours for the booking's day and week.
  const svc = base44.asServiceRole.entities;
  const bookings = await svc.Booking.filter(
    { teen_user_id: teenUserId, status: { $in: ACTIVE_STATUSES } },
    '-created_date',
    200,
  );
  const dayStart = startOfDay(start);
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  const weekStart = startOfWeek(start);
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
      nextEligible: atHour(nextDay(start), limits.earliestStartHour),
    };
  }
  if (weekHours + hrs > maxWeekly) {
    return {
      ok: false,
      reason: `This would exceed the ${maxWeekly}h weekly limit for a ${ageLabel} in ${state} during ${summer ? 'summer' : 'the school year'} (${weekHours}h already scheduled this week).`,
      nextEligible: atHour(nextWeekStart(start), limits.earliestStartHour),
    };
  }

  return { ok: true, dayHours, weekHours, maxDaily, maxWeekly };
}