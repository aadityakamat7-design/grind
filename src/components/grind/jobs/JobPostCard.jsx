import React from "react";
import { MapPin, CalendarDays, ShieldCheck, Lock } from "lucide-react";
import { format } from "date-fns";
import { CATEGORY_LABELS, money } from "@/lib/grind";
import { getMinAgeForCategory } from "@/lib/stateWorkRules";
import StatusBadge from "@/components/grind/StatusBadge";
import RatingStars from "@/components/grind/RatingStars";

export default function JobPostCard({ job, footer, buyerRating, buyerReviewCount }) {
  const categoryMinAge = job.category_min_age ?? getMinAgeForCategory(job.state, job.category);
  const ineligible = job.eligible_for_user === false;
  return (
    <div className={`bg-card rounded-2xl border border-border shadow-soft p-4 ${ineligible ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {CATEGORY_LABELS[job.category] || job.category}
          </p>
          <h3 className="font-semibold text-foreground mt-0.5 leading-snug truncate">{job.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">posted by {job.buyer_name}</p>
          {buyerReviewCount > 0 && (
            <div className="mt-1"><RatingStars rating={buyerRating} count={buyerReviewCount} size="w-3.5 h-3.5" /></div>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-foreground">{money(job.price)}</p>
          <p className="text-[11px] text-muted-foreground">{job.price_model === "HOURLY" ? "per hour" : "fixed"}</p>
        </div>
      </div>
      {job.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{job.description}</p>}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <StatusBadge status={job.status} />
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary text-muted-foreground border border-border px-2 py-0.5 text-[10px] font-medium">
          <ShieldCheck className="w-3 h-3" /> AI safety-checked{job.ai_minimum_age > 13 ? ` · ages ${job.ai_minimum_age}+` : ""}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary text-muted-foreground border border-border px-2 py-0.5 text-[10px] font-medium">
          Ages {categoryMinAge}+
        </span>
        {ineligible && (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 text-[10px] font-medium">
            <Lock className="w-3 h-3" /> {job.ineligible_reason || `Requires age ${categoryMinAge}+`}
          </span>
        )}
        {(job.zip || job.state) && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" /> {job.zip ? `ZIP ${job.zip}` : job.state}
          </span>
        )}
        {job.is_physical === false && (
          <span className="inline-flex items-center rounded-full bg-secondary text-muted-foreground px-2 py-0.5 text-[10px] font-medium">
            Remote
          </span>
        )}
        {job.scheduled_start && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="w-3.5 h-3.5" /> {format(new Date(job.scheduled_start), "MMM d, h:mm a")}
          </span>
        )}
      </div>
      {job.ai_law_notes && (
        <p className="text-[11px] text-muted-foreground mt-2">{job.ai_law_notes}</p>
      )}
      {job.status === "assigned" && job.assigned_teen_name && (
        <p className="text-xs font-medium text-foreground mt-2">Taken by {job.assigned_teen_name}</p>
      )}
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}