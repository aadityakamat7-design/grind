import React from "react";
import { Star } from "lucide-react";

export default function ProfileStatsWidget({ profile }) {
  const checks = [
    !!profile.photo_url,
    !!profile.bio,
    (profile.skills || []).length > 0,
    !!profile.zip,
    profile.status === "active",
  ];
  const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
      <div className="flex items-center gap-1.5">
        <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
        <span className="font-extrabold text-slate-900 text-lg">
          {profile.review_count > 0 ? profile.avg_rating?.toFixed(1) : "—"}
        </span>
        <span className="text-xs text-slate-400">({profile.review_count || 0})</span>
      </div>
      <div className="flex-1">
        <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
          <span>Profile completeness</span>
          <span className="text-blue-600">{pct}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}