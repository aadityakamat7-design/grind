import React from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { format } from "date-fns";

// Read-only timeline of check-in / check-out events for a booking.
// Shown to all participants — the parent uses this to monitor their teen's
// job progress (accepted → teen checked in → checked out) without any
// action buttons. All timestamps are server-set; this component only reads.
export default function CheckInTimeline({ booking }) {
  const teenName = booking.teen_display_name || "Teen";
  const buyerName = booking.buyer_name || "Neighbor";

  const events = [
    { label: "Job accepted", ts: null, done: ["confirmed", "in_progress", "completed"].includes(booking.status) },
    { label: `${teenName} checked in`, ts: booking.teen_started_at, done: !!booking.teen_started_at },
    { label: `${buyerName} checked in`, ts: booking.buyer_started_at, done: !!booking.buyer_started_at },
    { label: `${teenName} checked out`, ts: booking.teen_finished_at, done: !!booking.teen_finished_at },
    { label: `${buyerName} checked out`, ts: booking.buyer_finished_at, done: !!booking.buyer_finished_at },
  ];

  // Only render once the job has been accepted or has any check-in activity.
  const hasActivity = events.slice(1).some((e) => e.done);
  if (!hasActivity && !["confirmed", "in_progress", "completed"].includes(booking.status)) return null;

  return (
    <div className="mt-5 pt-4 border-t border-border">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Check-in timeline</p>
      <div className="space-y-3">
        {events.map((e, i) => (
          <div key={i} className="flex items-start gap-3">
            {e.done ? (
              <CheckCircle2 className="w-4 h-4 text-foreground mt-0.5 shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground/40 mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${e.done ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {e.label}
              </p>
              {e.ts && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(e.ts), "MMM d 'at' h:mm a")}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}