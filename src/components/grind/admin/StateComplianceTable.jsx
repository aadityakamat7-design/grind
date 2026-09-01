import React from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { VERIFIED_STATES } from "@/lib/stateHourLimits";
import { US_STATES } from "@/lib/stateWorkRules";

// Admin view showing which states are verified/enabled versus blocked.
// Expanding to a new state is a data change (add to VERIFIED_STATES), not a
// code change.
export default function StateComplianceTable() {
  const verifiedEntries = Object.entries(VERIFIED_STATES);
  const verifiedCodes = new Set(verifiedEntries.map(([code]) => code));

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <h2 className="text-[17px] font-bold text-foreground">State compliance status</h2>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Blockwork operates only in states with verified child-labor data. Unverified states are blocked at signup — expanding is a data change, not a code change.
      </p>

      {/* Verified / enabled states */}
      <div className="mb-5">
        <p className="text-xs font-bold text-emerald-700 mb-2 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" /> Verified & enabled
        </p>
        <div className="space-y-2">
          {verifiedEntries.map(([code, info]) => (
            <div key={code} className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-foreground">{US_STATES.find((s) => s.code === code)?.name || code}</p>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">ENABLED</span>
              </div>
              <div className="text-[11px] text-muted-foreground space-y-0.5">
                <p>Source: <a href={info.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{info.source}</a></p>
                <p>Verified: {info.verifiedDate}</p>
                <p>14–15: {info.limits["14_15"].maxDailyHoursSchoolDay}h/day school · {info.limits["14_15"].maxWeeklyHoursSchoolWeek}h/wk · {info.limits["14_15"].earliestStartHour}:00–{info.limits["14_15"].latestEndHour}:00</p>
                <p>16–17: {info.limits["16_17"].maxDailyHoursSchoolDay}h/day school · {info.limits["16_17"].maxWeeklyHoursSchoolWeek}h/wk · {info.limits["16_17"].earliestStartHour}:00–{info.limits["16_17"].latestEndHour}:00</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Blocked states */}
      <div>
        <p className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5" /> Blocked (unverified)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {US_STATES.filter((s) => !verifiedCodes.has(s.code)).map((s) => (
            <span key={s.code} className="text-[11px] text-muted-foreground bg-muted border border-border rounded-lg px-2 py-1">
              {s.name}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          {US_STATES.length - verifiedCodes.size} states blocked · Signups from these states are rejected server-side with a waitlist option.
        </p>
      </div>
    </div>
  );
}