import React from "react";
import { Wallet, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { money, computeFees } from "@/lib/grind";

export default function EarningsBreakdown({ booking }) {
  const gross = booking.price_total || 0;
  const fees = booking.platform_fee != null && booking.net_amount != null
    ? { platform_fee: booking.platform_fee, net_amount: booking.net_amount }
    : computeFees(gross);
  const released = booking.payment_status === "released";
  const youEarn = fees.net_amount + (booking.tip_amount || 0);

  return (
    <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-100">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
        <Wallet className="w-3.5 h-3.5" /> Your earnings for this job
      </p>
      <div className="flex justify-between text-sm text-slate-600">
        <span>Job price (gross)</span><span>{money(gross)}</span>
      </div>
      <div className="flex justify-between text-sm text-slate-500">
        <span>Platform fee (15%)</span><span>-{money(fees.platform_fee)}</span>
      </div>
      {booking.tip_amount > 0 && (
        <div className="flex justify-between text-sm text-emerald-600 font-semibold">
          <span>Tip</span><span>+{money(booking.tip_amount)}</span>
        </div>
      )}
      <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
        <span>You earn (85%)</span><span>{money(youEarn)}</span>
      </div>
      {released ? (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 pt-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Added to your Kickstart Wallet{booking.released_at ? ` on ${format(new Date(booking.released_at), "MMM d")}` : ""}
        </p>
      ) : (
        <p className="text-xs text-slate-400 pt-1 capitalize">Payment status: {booking.payment_status}</p>
      )}
    </div>
  );
}