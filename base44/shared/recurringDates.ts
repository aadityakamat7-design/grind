// Shared helpers for calculating recurring-series occurrence dates.
// Pure functions — no side effects, safe to import from any backend function.

/**
 * Given a recurrence pattern and a reference date, compute the next
 * occurrence date (as a JS Date) after the reference.
 *
 * @param recurrence  "weekly" | "biweekly" | "monthly"
 * @param refDate     The date to compute the next occurrence *after*
 * @param dayOfWeek   0–6 (Sun–Sat). Required for weekly/biweekly.
 * @param dayOfMonth  1–31. Required for monthly. If the month lacks that
 *                    day, the last day of the month is used.
 * @param timeOfDay   "HH:mm" — the time of day the occurrence starts.
 *                    Applied to the returned Date.
 */
export function nextOccurrenceDate(
  recurrence: string,
  refDate: Date,
  dayOfWeek?: number,
  dayOfMonth?: number,
  timeOfDay?: string,
): Date {
  const result = new Date(refDate);
  const [hh, mm] = (timeOfDay || "09:00").split(":").map(Number);

  if (recurrence === "weekly" || recurrence === "biweekly") {
    const targetDay = dayOfWeek ?? result.getDay();
    let diff = (targetDay - result.getDay() + 7) % 7;
    if (diff === 0) diff = 7; // always move to the *next* occurrence
    if (recurrence === "biweekly") diff += 7;
    result.setDate(result.getDate() + diff);
  } else if (recurrence === "monthly") {
    const target = dayOfMonth ?? result.getDate();
    // Move to next month first, then clamp to the last day if needed.
    result.setMonth(result.getMonth() + 1, 1);
    const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
    result.setDate(Math.min(target, lastDay));
  }

  result.setHours(hh || 9, mm || 0, 0, 0);
  return result;
}

/**
 * Format a Date as the dashboard-friendly "next on" label.
 * e.g. "next on Tue, Sep 16 at 4:00 PM"
 */
export function formatNextOccurrence(date: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const h = date.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()} at ${h12}:${m} ${ampm}`;
}