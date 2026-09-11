import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import LiveLocationCard from "@/components/grind/parent/LiveLocationCard";

export default function SafetyPanel({ activeJobs, alerts }) {
  return (
    <div>
      <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-1.5">
        <ShieldCheck className="w-4 h-4 text-emerald-500" /> Safety
      </h2>
      {alerts.length > 0 && (
        <Link to={alerts[0].link || "/notifications"} className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-3 hover:bg-rose-100 transition-colors">
          <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-rose-700 text-sm">{alerts[0].title}</p>
            <p className="text-xs text-rose-600 mt-0.5">{alerts[0].body}</p>
          </div>
        </Link>
      )}
      {activeJobs.length === 0 ? (
        <p className="text-sm text-slate-400">No jobs in progress right now. You'll see live location here whenever a job is active.</p>
      ) : (
        <div className="space-y-3">
          {activeJobs.map((b) => (
            <LiveLocationCard key={b.id} booking={b} />
          ))}
        </div>
      )}
    </div>
  );
}