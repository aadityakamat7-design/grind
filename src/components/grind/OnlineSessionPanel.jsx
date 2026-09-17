import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Video, Clock, CheckCircle2, AlertTriangle, Camera, Timer, FileText, Calendar } from "lucide-react";
import { Image } from "@/components/ui/image";
import { format } from "date-fns";

// Online tutoring session verification and completion flow.
// Replaces the generic JobHandshakePanel for online bookings in
// in_progress / completed / disputed states only — outdoor jobs keep
// their existing completion flow unchanged. The confirmed start flow
// is shared with outdoor jobs (handled by JobHandshakePanel).
//
//   in_progress (teen not finished) → session display + live timer + teen "End session"
//   in_progress (teen finished)     → session summary + buyer confirm/dispute
//   completed                       → session record + buyer dispute option
//   disputed                        → dispute status + session record
export default function OnlineSessionPanel({ booking, isTeen, isBuyer, isParent, acting, onFinish, onConfirm, onDispute }) {
  if (!isTeen && !isBuyer && !isParent) return null;

  const teenFinished = !!booking.teen_finished_at;

  // The session start is when both sides confirmed — the later of the two timestamps.
  const sessionStart = booking.teen_started_at && booking.buyer_started_at
    ? new Date(Math.max(new Date(booking.teen_started_at).getTime(), new Date(booking.buyer_started_at).getTime()))
    : null;

  if (booking.status === "in_progress") {
    if (!teenFinished) {
      return (
        <div className="space-y-4">
          <SessionConfirmationDisplay booking={booking} sessionStart={sessionStart} />
          {isTeen && (
            <Button className="w-full rounded-xl" disabled={acting} onClick={onFinish}>
              <Camera className="w-4 h-4 mr-2" /> End session & upload proof
            </Button>
          )}
          {!isTeen && (
            <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium text-center">
              <Clock className="w-3.5 h-3.5" /> Waiting for {booking.teen_display_name} to end the session.
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <SessionSummaryCard booking={booking} sessionStart={sessionStart} />
        {isBuyer && (
          <>
            <Button className="w-full rounded-xl" disabled={acting} onClick={onConfirm}>
              <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm session & release payment
            </Button>
            <Button variant="outline" className="w-full rounded-xl text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive" disabled={acting} onClick={onDispute}>
              <AlertTriangle className="w-4 h-4 mr-2" /> Report a problem
            </Button>
            <p className="text-xs text-center text-slate-500 font-medium">
              Review the session summary and proof photo. Confirm to release payment, or report if the session didn't happen as described.
            </p>
          </>
        )}
        {(isTeen || isParent) && (
          <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium text-center">
            <Clock className="w-3.5 h-3.5" /> Waiting for the neighbor to confirm the session.
          </p>
        )}
      </div>
    );
  }

  if (booking.status === "completed") {
    const canDispute = isBuyer && !booking.buyer_disputed_at;
    return (
      <div className="space-y-4">
        <SessionSummaryCard booking={booking} sessionStart={sessionStart} />
        {canDispute && (
          <>
            <Button variant="outline" className="w-full rounded-xl text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive" disabled={acting} onClick={onDispute}>
              <AlertTriangle className="w-4 h-4 mr-2" /> Report session not done
            </Button>
            <p className="text-xs text-center text-slate-400">If the session didn't happen as described, report it to request a refund.</p>
          </>
        )}
      </div>
    );
  }

  if (booking.status === "disputed") {
    return (
      <div className="space-y-4">
        <SessionSummaryCard booking={booking} sessionStart={sessionStart} />
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-700">
            <AlertTriangle className="w-4 h-4" /> Under review
          </p>
          <p className="text-xs text-amber-600">
            {isBuyer
              ? "You reported this session didn't happen as described. Our team is reviewing the proof photo and will resolve it soon."
              : "The neighbor reported this session didn't happen as described. Payment is held pending review."}
          </p>
          {booking.dispute_reason && (
            <p className="text-xs text-amber-600 italic">"{booking.dispute_reason}"</p>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// Live elapsed-time indicator + session confirmation display.
// Shows the scheduled time, the actual start time, and a ticking
// elapsed timer while the session is active.
function SessionConfirmationDisplay({ booking, sessionStart }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!sessionStart) return;
    const tick = () => setElapsed(Date.now() - sessionStart.getTime());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sessionStart]);

  return (
    <div className="rounded-xl border border-border bg-secondary/60 p-4 space-y-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Video className="w-4 h-4 text-primary" /> Session in progress
      </p>
      <div className="space-y-2 text-sm">
        {booking.scheduled_start && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" /> Scheduled: {format(new Date(booking.scheduled_start), "EEE, MMM d 'at' h:mm a")}
          </p>
        )}
        {sessionStart && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" /> Started: {format(sessionStart, "h:mm a")}
          </p>
        )}
        {sessionStart && (
          <p className="flex items-center gap-2 font-semibold text-primary">
            <Timer className="w-3.5 h-3.5" /> Elapsed: {formatDuration(elapsed)}
          </p>
        )}
      </div>
    </div>
  );
}

// Session summary — shown to buyer for confirmation, and permanently
// on the booking record after completion.
function SessionSummaryCard({ booking, sessionStart }) {
  const duration = booking.session_duration_minutes;
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Video className="w-4 h-4 text-primary" /> Session record
      </p>
      <div className="space-y-2 text-sm">
        {booking.scheduled_start && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" /> Scheduled: {format(new Date(booking.scheduled_start), "EEE, MMM d 'at' h:mm a")}
          </p>
        )}
        {sessionStart && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" /> Started: {format(sessionStart, "h:mm a")}
          </p>
        )}
        {duration != null && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Timer className="w-3.5 h-3.5" /> Actual duration: {formatMinutes(duration)}
          </p>
        )}
        {booking.session_note && (
          <p className="flex items-start gap-2 text-muted-foreground">
            <FileText className="w-3.5 h-3.5 mt-0.5" /> {booking.session_note}
          </p>
        )}
      </div>
      {booking.completion_photos && booking.completion_photos.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5" /> Proof photo
          </p>
          <div className="grid grid-cols-3 gap-2">
            {booking.completion_photos.map((url) => (
              <div key={url} className="aspect-square rounded-xl overflow-hidden border border-border">
                <Image src={url} alt="Session proof" className="w-full h-full" fittingType="fill" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatMinutes(mins) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}