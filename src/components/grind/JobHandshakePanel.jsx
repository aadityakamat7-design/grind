import React from "react";
import { Button } from "@/components/ui/button";
import { Play, CheckCircle2, Clock, Camera, AlertTriangle, Image as ImageIcon } from "lucide-react";
import { Image } from "@/components/ui/image";

// Photo-proof job completion UI:
//   confirmed    → both sides press Start (buyer pays escrow)
//   in_progress   → teen finishes with photos, buyer confirms or disputes
//   disputed     → shows the dispute status (under admin review)
export default function JobHandshakePanel({ booking, isTeen, isBuyer, acting, onStart, onFinish, onConfirm, onDispute }) {
  if (!isTeen && !isBuyer) return null;

  const teenFinished = !!booking.teen_finished_at;
  const otherName = isTeen ? booking.buyer_name : booking.teen_display_name;

  if (booking.status === "confirmed") {
    const amount = booking.charge_amount ?? booking.price_total;
    const mineStarted = isTeen ? !!booking.teen_started_at : !!booking.buyer_started_at;
    const theirsStarted = isTeen ? !!booking.buyer_started_at : !!booking.teen_started_at;
    return (
      <div className="space-y-2">
        <Button className="w-full rounded-xl" disabled={acting || mineStarted} onClick={onStart}>
          <Play className="w-4 h-4 mr-2" />
          {mineStarted
            ? "You're ready to start"
            : isBuyer
              ? `Start job & pay $${Number(amount || 0).toFixed(2)}`
              : "Start job"}
        </Button>
        <WaitingLine mineDone={mineStarted} theirsDone={theirsStarted} otherName={otherName} verb="start" isBuyer={isBuyer} />
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