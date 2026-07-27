import React from "react";
import { Button } from "@/components/ui/button";
import { Play, CheckCircle2, Clock } from "lucide-react";

// Two-sided confirmation UI: a job only starts when both the teen and the
// neighbor press Start, and only pays out when both press Finish.
export default function JobHandshakePanel({ booking, isTeen, isBuyer, acting, onStart, onFinish }) {
  if (!isTeen && !isBuyer) return null;

  const mine = isTeen
    ? { started: booking.teen_started_at, finished: booking.teen_finished_at }
    : { started: booking.buyer_started_at, finished: booking.buyer_finished_at };
  const theirs = isTeen
    ? { started: booking.buyer_started_at, finished: booking.buyer_finished_at }
    : { started: booking.teen_started_at, finished: booking.teen_finished_at };
  const otherName = isTeen ? booking.buyer_name : booking.teen_display_name;

  if (booking.status === "confirmed") {
    const amount = booking.charge_amount ?? booking.price_total;
    return (
      <div className="space-y-2">
        <Button className="w-full rounded-xl" disabled={acting || !!mine.started} onClick={onStart}>
          <Play className="w-4 h-4 mr-2" />
          {mine.started
            ? "You're ready to start"
            : isBuyer
              ? `Start job & pay $${Number(amount || 0).toFixed(2)}`
              : "Start job"}
        </Button>
        <WaitingLine
          mineDone={!!mine.started}
          theirsDone={!!theirs.started}
          otherName={otherName}
          verb="start"
          isBuyer={isBuyer}
        />
      </div>
    );
  }

  if (booking.status === "in_progress") {
    return (
      <div className="space-y-2">
        <Button className="w-full rounded-xl" disabled={acting || !!mine.finished} onClick={onFinish}>
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {mine.finished ? "You marked it finished" : "Finish job"}
        </Button>
        <WaitingLine
          mineDone={!!mine.finished}
          theirsDone={!!theirs.finished}
          otherName={otherName}
          verb="finish"
        />
      </div>
    );
  }

  return null;
}

function WaitingLine({ mineDone, theirsDone, otherName, verb, isBuyer }) {
  if (mineDone && !theirsDone) {
    return (
      <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
        <Clock className="w-3 h-3" /> Waiting for {otherName} to {verb} too.
      </p>
    );
  }
  if (!mineDone && theirsDone) {
    return (
      <p className="text-xs text-center text-slate-500 font-medium">
        {otherName} is ready — {verb === "start" && isBuyer ? "tap to pay and " : ""}{verb} the job.
      </p>
    );
  }
  return (
    <p className="text-xs text-center text-slate-400">
      {verb === "start"
        ? "Both of you must confirm to start. The neighbor pays when they start."
        : "Both of you must confirm to finish the job."}
    </p>
  );
}