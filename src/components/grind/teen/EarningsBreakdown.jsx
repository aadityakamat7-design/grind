import React from "react";
import { Wallet, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { money } from "@/lib/grind";

export default function EarningsBreakdown({ booking }) {
  const released = booking.payment_status === "released";
  const youEarn = (booking.net_amount || 0) + (booking.tip_amount || 0);
  const cancelled = ["cancelled", "denied"].includes(booking.status);

  if (cancelled) {
    return (
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5" /> Your earnings for this job
        </p>
        <p className="text-sm text-slate-500 mt-2">No earnings — job cancelled.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
        <Wallet className="w-3.5 h-3.5" /> Your earnings for this job
      </p>
      <div className="flex justify-between text-sm font-bold text-slate-900 pt-2">
        <span>Your earnings</span><span>{money(youEarn)}</span>
      </div>
      {booking.tip_amount > 0 && (
        <p className="text-xs text-emerald-600 font-semibold mt-1">
          Includes {money(booking.tip_amount)} tip
        </p>
      )}
      {released ? (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 pt-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Added to your Blockwork Wallet{booking.released_at ? ` on ${format(new Date(booking.released_at), "MMM d")}` : ""}
        </p>
      ) : (
        <p className="text-xs text-slate-400 pt-1 capitalize">Payment status: {booking.payment_status}</p>
      )}
    </div>
  );
}