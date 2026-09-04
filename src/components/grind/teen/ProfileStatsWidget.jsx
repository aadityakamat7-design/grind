import React from "react";
import { useNavigate } from "react-router-dom";
import { Star, Briefcase, ChevronRight } from "lucide-react";

export default function ProfileStatsWidget({ profile }) {
  const navigate = useNavigate();
  const checks = [
    !!profile.photo_url,
    !!profile.bio,
    (profile.skills || []).length > 0,
    !!profile.zip,
  ];
  const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  return (
    <div
      onClick={() => navigate(`/teens/${profile.user_id}`)}
      className="cursor-pointer bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md active:scale-[0.99] transition-all"
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
          <span className="font-extrabold text-slate-900 text-lg">
            {profile.review_count > 0 ? profile.avg_rating?.toFixed(1) : "—"}
          </span>
          <span className="text-xs text-slate-400">({profile.review_count || 0})</span>
        </div>
        <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
          <Briefcase className="w-5 h-5 text-slate-400" />
          <span className="font-extrabold text-slate-900 text-lg">{profile.jobs_completed || 0}</span>
          <span className="text-xs text-slate-400">jobs</span>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
      </div>
      <div className="flex-1 mt-3">
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