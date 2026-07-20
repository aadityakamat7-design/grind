import React from "react";
import { Link } from "react-router-dom";
import { MapPin, ShieldAlert, ShieldCheck } from "lucide-react";

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
            <Link key={b.id} to={`/bookings/${b.id}`} className="block bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <p className="font-bold text-slate-900 text-sm">{b.teen_display_name} · {b.listing_title}</p>
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
                </span>
              </div>
              <div className="mt-2.5 h-20 rounded-xl bg-gradient-to-br from-blue-50 to-sky-100 flex items-center justify-center relative overflow-hidden">
                <MapPin className="w-6 h-6 text-blue-500" />
                <span className="absolute bottom-1.5 right-2 text-[10px] font-semibold text-blue-600/70">Live location · updated just now</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">At {b.address} with {b.buyer_name}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}