import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle } from "lucide-react";

export default function ProfileCompleteness({ profile }) {
  const checks = [
    { label: "Display name", done: !!profile?.display_name },
    { label: "Bio", done: !!profile?.bio?.trim() },
    { label: "Photo", done: !!profile?.photo_url },
    { label: "Skills listed", done: (profile?.skills?.length || 0) > 0 },
    { label: "Parent linked", done: profile?.status === "active" },
  ];
  const doneCount = checks.filter((c) => c.done).length;
  const pct = Math.round((doneCount / checks.length) * 100);

  return (
    <Link to="/account" className="block bg-card rounded-2xl border border-border shadow-soft p-4 hover:shadow-card transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[14px] font-bold text-foreground">Profile completeness</h3>
        <span className={`text-[13px] font-bold ${pct === 100 ? "text-emerald-600" : "text-primary"}`}>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5 text-[12px]">
            {c.done ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />}
            <span className={c.done ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
          </div>
        ))}
      </div>
    </Link>
  );
}