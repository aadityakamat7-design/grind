import React from "react";
import { MapPin, CalendarDays, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { CATEGORY_LABELS, money } from "@/lib/grind";
import StatusBadge from "@/components/grind/StatusBadge";

export default function JobPostCard({ job, footer }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
            {CATEGORY_LABELS[job.category] || job.category}
          </p>
          <h3 className="font-bold text-slate-900 mt-0.5 leading-snug">{job.title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">posted by {job.buyer_name}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-extrabold text-slate-900">{money(job.price)}</p>
          <p className="text-[11px] text-slate-400">{job.price_model === "HOURLY" ? "per hour" : "fixed"}</p>
        </div>
      </div>
      {job.description && <p className="text-sm text-slate-500 mt-2 line-clamp-3">{job.description}</p>}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <StatusBadge status={job.status} />
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
          <ShieldCheck className="w-3 h-3" /> AI safety-checked{job.ai_minimum_age > 13 ? ` · ages ${job.ai_minimum_age}+` : ""}
        </span>
        {(job.zip || job.state) && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="w-3.5 h-3.5" /> {job.zip ? `ZIP ${job.zip}` : job.state}
          </span>
        )}
        {job.is_physical === false && (
          <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-bold">
            Remote
          </span>
        )}
        {job.scheduled_start && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <CalendarDays className="w-3.5 h-3.5" /> {format(new Date(job.scheduled_start), "MMM d, h:mm a")}
          </span>
        )}
      </div>
      {job.ai_law_notes && (
        <p className="text-[11px] text-slate-400 mt-2">{job.ai_law_notes}</p>
      )}
      {job.status === "assigned" && job.assigned_teen_name && (
        <p className="text-xs font-semibold text-slate-700 mt-2">Taken by {job.assigned_teen_name}</p>
      )}
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}