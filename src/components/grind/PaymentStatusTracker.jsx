import React from "react";
import { CheckCircle2, Circle, Clock, RotateCcw } from "lucide-react";

// Visual escrow → payout timeline so users always know where the money is.
export default function PaymentStatusTracker({ booking }) {
  const { payment_status, payout_status } = booking;
  if (!payment_status || payment_status === "unpaid") return null;

  if (payment_status === "refunded") {
    return (
      <div className="mt-4 flex items-center gap-2 bg-slate-50 rounded-xl p-3 text-sm text-slate-600">
        <RotateCcw className="w-4 h-4 text-slate-400" />
        Payment refunded to {booking.buyer_name || "the neighbor"}. Refunds appear on the card in 5–10 business days.
      </div>
    );
  }

  const steps = [
    { key: "held", label: "Payment held", detail: "Funds are held securely in escrow until the job is done." },
    { key: "released", label: "Released to parent", detail: releasedDetail(payout_status) },
    { key: "transferred", label: "Transferred to bank", detail: "Typically arrives in the parent's bank in 1–2 business days." },
  ];
  const current =
    payment_status === "held" ? 0 : payout_status === "transferred" ? 2 : 1;

  return (
    <div className="mt-4 bg-slate-50 rounded-xl p-4 space-y-3">
      {steps.map((s, i) => {
        const done = i < current || (i === 2 && payout_status === "transferred");
        const active = i === current && !done;
        return (
          <div key={s.key} className="flex items-start gap-2.5">
            {done ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            ) : active ? (
              <Clock className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-slate-300 mt-0.5 shrink-0" />
            )}
            <div>
              <p className={`text-sm font-semibold ${done || active ? "text-slate-900" : "text-slate-400"}`}>{s.label}</p>
              {(done || active) && <p className="text-xs text-slate-500 mt-0.5">{s.detail}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function releasedDetail(payoutStatus) {
  if (payoutStatus === "pending_review")
    return "In a short safety review before transfer — usually cleared within 1 business day.";
  if (payoutStatus === "awaiting_bank")
    return "Waiting for the parent to connect a bank account in Payouts.";
  return "The buyer confirmed completion — the payout is being sent to the parent's account.";
}