// Parent-set limits for a teen (max hours/week, allowed days and hours, no
// school nights, max distance from home). Enforced server-side wherever a teen
// could otherwise work: taking a job, being booked, and setting availability.
//
// The stricter of the parent's limits and the legal limits always wins. Legal
// caps live in workHourEnforcement.ts; this module only ever ADDS restrictions
// and never loosens a legal one.
import { getStateTimezone, getLocalHour, getLocalDayOfWeek } from './localTime.ts';

export interface ParentLimits {
  max_hours_per_week?: number | null;
  /** Day-of-week numbers 0=Sun … 6=Sat. Empty/absent = every day allowed. */
  allowed_days?: number[] | null;
  earliest_hour?: number | null;
  latest_hour?: number | null;
  /** No jobs Sunday–Thursday after 6 PM. */
  no_school_nights?: boolean;
  max_distance_miles?: number | null;
}

const SCHOOL_NIGHT_DAYS = [0, 1, 2, 3, 4]; // Sun, Mon, Tue, Wed, Thu
const SCHOOL_NIGHT_START_HOUR = 18;

export function formatHour(hour: number): string {
  const h = Math.floor(hour);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display} ${suffix}`;
}

/** The tighter of the teen's own service radius and their parent's distance cap. */
export function effectiveRadiusMiles(teenRadius?: number | null, limits?: ParentLimits | null): number {
  const base = Number(teenRadius) || 3;
  const cap = Number(limits?.max_distance_miles);
  if (!Number.isFinite(cap) || cap <= 0) return base;
  return Math.min(base, cap);
}

/** The linked, confirmed parent's limits for a teen (null when none are set). */
export async function getParentLimitsForTeen(svc, teenUserId: string) {
  const links = await svc.ParentTeenLink.filter({ teen_user_id: teenUserId, status: 'confirmed' });
  const link = links[0] || null;
  return { link, limits: (link?.limits || null) as ParentLimits | null };
}

export interface LimitCheck {
  ok: boolean;
  /** Machine code — the page decides the wording (neighbor sees "Not available at that time."). */
  code?: 'day' | 'hours_window' | 'school_night' | 'weekly_hours';
  reason?: string;
}

/**
 * Checks ONE booking occurrence against the parent's limits.
 * weekHoursAlready is the teen's already-scheduled hours in that local week
 * (returned by enforceBookingHours) so the weekly cap is the stricter of the
 * legal and parent limits.
 */
export function checkParentLimits(opts: {
  limits?: ParentLimits | null;
  state?: string | null;
  scheduledStart?: string | null;
  estimatedHours?: number;
  weekHoursAlready?: number;
}): LimitCheck {
  const { limits, state, scheduledStart } = opts;
  if (!limits || !scheduledStart) return { ok: true };
  const start = new Date(scheduledStart);
  if (isNaN(start.getTime())) return { ok: true };

  const tz = getStateTimezone(state);
  const day = getLocalDayOfWeek(start, tz);
  const startHour = getLocalHour(start, tz);
  const hrs = Number(opts.estimatedHours) || 2;
  const endHour = startHour + hrs;

  if (Array.isArray(limits.allowed_days) && limits.allowed_days.length > 0 && !limits.allowed_days.includes(day)) {
    return {
      ok: false,
      code: 'day',
      reason: 'Your parent set which days you can work, and this is not one of them.',
    };
  }

  const earliest = Number(limits.earliest_hour);
  const latest = Number(limits.latest_hour);
  if (Number.isFinite(earliest) && startHour < earliest) {
    return {
      ok: false,
      code: 'hours_window',
      reason: `Your parent set your working hours to start at ${formatHour(earliest)} or later.`,
    };
  }
  if (Number.isFinite(latest) && endHour > latest) {
    return {
      ok: false,
      code: 'hours_window',
      reason: `This would run past ${formatHour(latest)}, the latest your parent allows you to work.`,
    };
  }

  if (limits.no_school_nights && SCHOOL_NIGHT_DAYS.includes(day) && endHour > SCHOOL_NIGHT_START_HOUR) {
    return {
      ok: false,
      code: 'school_night',
      reason: 'Your parent turned on "No jobs on school nights" (Sunday–Thursday after 6 PM).',
    };
  }

  const weeklyCap = Number(limits.max_hours_per_week);
  if (Number.isFinite(weeklyCap) && weeklyCap > 0) {
    const already = Number(opts.weekHoursAlready) || 0;
    if (already + hrs > weeklyCap) {
      return {
        ok: false,
        code: 'weekly_hours',
        reason: `This would pass the ${weeklyCap}-hour weekly limit your parent set (${already}h already scheduled this week).`,
      };
    }
  }

  return { ok: true };
}

/** The message a neighbor sees when a parent's limit gets in the way. */
export const NOT_AVAILABLE_AT_THAT_TIME = 'Not available at that time.';

/** True when an availability slot breaches the parent's days/hours limits. */
export function availabilitySlotBreaches(slot: { day: number; start: string; end: string }, limits?: ParentLimits | null): string | null {
  if (!limits) return null;
  if (Array.isArray(limits.allowed_days) && limits.allowed_days.length > 0 && !limits.allowed_days.includes(slot.day)) {
    return 'Your parent set which days you can work.';
  }
  const startH = parseInt(String(slot.start).split(':')[0], 10);
  const endH = parseInt(String(slot.end).split(':')[0], 10);
  const earliest = Number(limits.earliest_hour);
  const latest = Number(limits.latest_hour);
  if (Number.isFinite(earliest) && startH < earliest) return `Your parent allows work from ${formatHour(earliest)}.`;
  if (Number.isFinite(latest) && endH > latest) return `Your parent allows work until ${formatHour(latest)}.`;
  if (limits.no_school_nights && SCHOOL_NIGHT_DAYS.includes(slot.day) && endH > SCHOOL_NIGHT_START_HOUR) {
    return 'Your parent turned on "No jobs on school nights" (Sunday–Thursday after 6 PM).';
  }
  return null;
}