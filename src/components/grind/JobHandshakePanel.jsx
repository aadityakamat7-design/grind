import React from "react";
import { Button } from "@/components/ui/button";
import { Play, CheckCircle2, Clock, Camera, AlertTriangle, Image as ImageIcon } from "lucide-react";
import { Image } from "@/components/ui/image";
import { money } from "@/lib/grind";

// Photo-proof job completion UI:
//   confirmed    → both sides press Start (buyer pays escrow)
//   in_progress   → teen finishes with photos, buyer confirms or disputes
//   disputed     → shows the dispute status (under admin review)
export default function JobHandshakePanel({ booking, isTeen, isBuyer, isParent, acting, onStart, onFinish, onConfirm, onDispute }) {
  if (!isTeen && !isBuyer && !isParent) return null;

  const teenFinished = !!booking.teen_finished_at;
  const otherName = isTeen ? booking.buyer_name : booking.teen_display_name;

  if (booking.status === "confirmed") {
    const amount = booking.charge_amount ?? booking.price_total;
    const teenStarted = !!booking.teen_started_at;
    const buyerStarted = !!booking.buyer_started_at;
    const gatingDone = teenStarted && buyerStarted;

    // Teen confirms they're ready first. The buyer can only pay after this.
    // The job goes in_progress once both the teen and the buyer have confirmed.
    if (isTeen) {
      return (
        <div className="space-y-2">
          <Button className="w-full rounded-xl" disabled={acting || teenStarted} onClick={onStart}>
            <Play className="w-4 h-4 mr-2" />
            {teenStarted ? "You're ready" : "I'm ready"}
          </Button>
          <p className="text-xs text-center text-slate-500 font-medium">
            {gatingDone
              ? "Both confirmed — job is in progress."
              : teenStarted
                ? "You're ready — waiting for the neighbor to pay and start."
                : "Confirm you're ready first — the neighbor can pay once you do."}
          </p>
        </div>
      );
    }

    // Parent observes the start — they do not confirm it themselves.
    if (isParent) {
      return (
        <p className="text-xs text-center text-slate-500 font-medium">
          {gatingDone
            ? "The job is in progress."
            : teenStarted
              ? "The teen is ready — waiting for the neighbor to pay and start."
              : "Waiting for the teen to confirm they're ready."}
        </p>
      );
    }

    // Buyer hasn't paid yet — waiting for teen to be ready first
    if (!teenStarted) {
      return (
        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium text-center">
          <Clock className="w-3.5 h-3.5" /> Waiting for {booking.teen_display_name} to confirm they're ready.
        </p>
      );
    }

    // Buyer has already paid — show status message only
    if (buyerStarted) {
      return (
        <p className="text-xs text-center text-slate-500 font-medium">
          {gatingDone ? "Job is in progress." : "Payment held — waiting for the teen to confirm start."}
        </p>
      );
    }

    // No charge needed (referral credit or free job) — show start button
    if (amount <= 0) {
      return (
        <div className="space-y-2">
          <Button className="w-full rounded-xl" disabled={acting} onClick={onStart}>
            <Play className="w-4 h-4 mr-2" /> Start job
          </Button>
          <p className="text-xs text-center text-slate-500 font-medium">
            Confirm start — the job begins once the teen confirms too.
          </p>
        </div>
      );
    }

    // Teen is ready — show the pay-to-start button. This creates a Stripe
    // Checkout Session and redirects the buyer to pay the escrow.
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-xl p-3 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {booking.teen_display_name} is ready!
        </div>
        <Button className="w-full rounded-xl" disabled={acting} onClick={onStart}>
          <Play className="w-4 h-4 mr-2" /> Pay {money(amount)} to start
        </Button>
        <p className="text-xs text-center text-slate-500 font-medium">
          Payment is held in escrow until the job is confirmed complete.
        </p>
      </div>
    );
  }

  if (booking.status === "in_progress") {
    // Teen hasn't finished yet
    if (!teenFinished) {
      if (isTeen) {
        return (
          <Button className="w-full rounded-xl" disabled={acting} onClick={onFinish}>
            <Camera className="w-4 h-4 mr-2" /> Finish job & upload photos
          </Button>
        );
      }
      return (
        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium text-center">
          <Clock className="w-3.5 h-3.5" /> Waiting for {otherName} to finish the job.
        </p>
      );
    }

    // Teen finished — waiting for buyer confirmation
    if (isTeen) {
      return (
        <div className="space-y-3">
          <PhotosPreview photos={booking.completion_photos} />
          <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium text-center">
            <Clock className="w-3.5 h-3.5" /> Waiting for {otherName} to confirm your work. Payment releases once they confirm (or automatically after 12 hours).
          </p>
        </div>
      );
    }

    if (isBuyer) {
      return (
        <div className="space-y-3">
          <PhotosPreview photos={booking.completion_photos} />
          <div className="grid grid-cols-1 gap-2">
            <Button className="w-full rounded-xl" disabled={acting} onClick={onConfirm}>
              <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm job done & pay
            </Button>
            <Button variant="outline" className="w-full rounded-xl text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive" disabled={acting} onClick={onDispute}>
              <AlertTriangle className="w-4 h-4 mr-2" /> Report work not done
            </Button>
          </div>
          <p className="text-xs text-center text-slate-400">Confirm within 12 hours — payment releases automatically to the teen's parent if there's no response.</p>
        </div>
      );
    }
  }

  if (booking.status === "disputed") {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-700">
          <AlertTriangle className="w-4 h-4" /> Under review
        </p>
        <p className="text-xs text-amber-600">
          {isBuyer
            ? "You reported this work wasn't done correctly. Our team is reviewing the photos and will resolve it soon."
            : "The neighbor reported this work wasn't done correctly. Payment is held pending review."}
        </p>
        {booking.dispute_reason && (
          <p className="text-xs text-amber-600 italic">"{booking.dispute_reason}"</p>
        )}
      </div>
    );
  }

  return null;
}

function PhotosPreview({ photos }) {
  if (!photos || photos.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
        <ImageIcon className="w-3.5 h-3.5" /> Completion photos
      </p>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((url) => (
          <div key={url} className="aspect-square rounded-xl overflow-hidden border border-border">
            <Image src={url} alt="Completion proof" className="w-full h-full" fittingType="fill" />
          </div>
        ))}
      </div>
    </div>
  );
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