import React from "react";
import { ShieldCheck, Clock, Calendar, AlertTriangle, FileText } from "lucide-react";
import { stateName } from "@/lib/stateWorkRules";

// Displays the specific California child-labor rules that apply to the teen,
// pulled from the verified California lookup table. Shown to the parent
// BEFORE they consent — they must see and acknowledge these specific rules.
export default function StateRulesDisplay({ stateRules, teenName }) {
  if (!stateRules) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-700">State rules unavailable</p>
            <p className="text-[11px] text-amber-600 mt-0.5">
              {teenName}'s state or age isn't on file yet. They'll need to complete their profile
              and identity verification before the link can be fully confirmed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { state, age, categoryMinAges, hourRules } = stateRules;
  const categories = [
    { key: "tutoring", label: "Online tutoring" },
    { key: "tech_help", label: "Tech help" },
    { key: "lawn_care", label: "Lawn care" },
    { key: "car_washing", label: "Car washing" },
    { key: "odd_jobs", label: "Odd jobs" },
    { key: "pet_sitting", label: "Pet sitting" },
  ];

  return (
    <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-blue-600" />
        <p className="text-xs font-bold text-blue-900">
          California child-labor rules for {teenName} — age {age}
        </p>
      </div>

      <div>
        <p className="text-[11px] font-bold text-blue-800 mb-1.5">Minimum age by job category</p>
        <div className="grid grid-cols-2 gap-1.5">
          {categories.map((cat) => {
            const minAge = categoryMinAges?.[cat.key];
            const eligible = age >= minAge;
            return (
              <div key={cat.key} className="flex items-center justify-between bg-white rounded-lg px-2.5 py-1.5 border border-blue-100">
                <span className="text-[11px] text-slate-700">{cat.label}</span>
                <span className={`text-[11px] font-bold ${eligible ? "text-emerald-600" : "text-amber-600"}`}>
                  {minAge}+
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-lg p-2.5 border border-blue-100">
          <div className="flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3 text-blue-500" />
            <p className="text-[10px] font-bold text-slate-700">School day</p>
          </div>
          <p className="text-[11px] text-slate-600">{hourRules.maxDailyHoursSchoolDay}h/day max</p>
          <p className="text-[11px] text-slate-600">{hourRules.maxWeeklyHoursSchoolWeek}h/week max</p>
        </div>
        <div className="bg-white rounded-lg p-2.5 border border-blue-100">
          <div className="flex items-center gap-1 mb-1">
            <Calendar className="w-3 h-3 text-blue-500" />
            <p className="text-[10px] font-bold text-slate-700">Non-school day</p>
          </div>
          <p className="text-[11px] text-slate-600">{hourRules.maxDailyHoursNonSchoolDay}h/day max</p>
          <p className="text-[11px] text-slate-600">{hourRules.maxWeeklyHoursSummer}h/week (summer)</p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-2.5 border border-blue-100">
        <p className="text-[10px] font-bold text-slate-700 mb-1">Permitted hours</p>
        <p className="text-[11px] text-slate-600">
          {hourRules.earliestStartHour}:00 – {hourRules.latestEndHour}:00 ({hourRules.latestEndHourSummer}:00 in summer)
        </p>
        {hourRules.prohibitedDuringSchoolHours && (
          <p className="text-[11px] text-amber-600 mt-1">
            ⚠ No work during school hours ({hourRules.schoolHoursStart}–{hourRules.schoolHoursEnd}) on school days
          </p>
        )}
      </div>

      <div className="flex items-start gap-1.5">
        <FileText className="w-3 h-3 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-[10px] text-slate-500 italic">
          Source: California DIR Child Labor Law Pamphlet (dir.ca.gov/dlse). Verified {stateName(state)} rules — Blockwork operates in California only.
        </p>
      </div>
    </div>
  );
}