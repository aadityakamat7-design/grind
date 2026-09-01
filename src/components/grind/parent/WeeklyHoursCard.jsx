import React from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { getWorkHourRules, isSummerDate, isSchoolDayDate, formatHour } from "@/lib/stateWorkRules";

// Shows the parent a running total of their teen's hours worked/scheduled
// this week against the legal limit for the teen's verified age and state.
// Adults (18+) have no limits — render nothing.
export default function WeeklyHoursCard({ teenName, teenState, teenAge, bookings }) {
  if (teenAge == null || !teenState || teenAge >= 18) return null;

  const rules = getWorkHourRules(teenState, teenAge);
  if (!rules) return null; // unverified state — fail closed
  const now = new Date();

  const schoolDay = isSchoolDayDate(now);
  const summer = isSummerDate(now);
  const maxWeekly = schoolDay ? rules.maxWeeklyHoursSchoolWeek : rules.maxWeeklyHoursSummer;
  const label = schoolDay ? "school week" : summer ? "summer week" : "non-school week";

  const weekStart = new Date(now);
  const day = weekStart.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const activeBookings = bookings.filter((b) => {
    if (!["confirmed", "in_progress", "completed"].includes(b.status)) return false;
    if (!b.scheduled_start) return false;
    const d = new Date(b.scheduled_start);
    return d >= weekStart && d < weekEnd;
  });

  const hoursThisWeek = activeBookings.reduce((sum, b) => sum + (Number(b.estimated_hours) || 2), 0);
  const remaining = Math.max(0, maxWeekly - hoursThisWeek);
  const pct = Math.min(100, Math.round((hoursThisWeek / maxWeekly) * 100));
  const approaching = pct >= 80;
  const exceeded = hoursThisWeek > maxWeekly;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="font-bold text-foreground text-sm flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-primary" /> {teenName}'s hours this week
        </p>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
          exceeded ? "bg-destructive/15 text-destructive" : approaching ? "bg-amber text-amber-foreground" : "bg-success/15 text-success"
        }`}>
          {hoursThisWeek}h / {maxWeekly}h
        </span>
      </div>

      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            exceeded ? "bg-destructive" : approaching ? "bg-amber" : "bg-success"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-2">
        <p className="text-[11px] text-muted-foreground">
          Legal limit: {maxWeekly}h/{label} for age {teenAge} in {teenState}
        </p>
        {(approaching || exceeded) ? (
          <p className="text-[11px] font-semibold flex items-center gap-1 text-amber">
            <AlertTriangle className="w-3 h-3" />
            {exceeded ? "Limit exceeded" : "Approaching limit"}
          </p>
        ) : (
          <p className="text-[11px] font-semibold text-foreground">{remaining}h remaining</p>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground mt-1.5">
        Permitted hours: {formatHour(rules.earliestStartHour)}–{formatHour(rules.latestEndHour)}
        {summer && rules.latestEndHourSummer !== rules.latestEndHour && ` (${formatHour(rules.latestEndHourSummer)} in summer)`}
        {rules.prohibitedDuringSchoolHours && " · No work during school hours on school days"}
      </p>
      <p className="text-[10px] text-muted-foreground mt-1">
        Blockwork enforces these limits automatically. You're responsible for monitoring your teen's total work hours, including any work outside Blockwork.
      </p>
    </div>
  );
}