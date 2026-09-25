import React from "react";
import { CheckCircle2, Circle, Clock, Lock, RotateCcw } from "lucide-react";

// Role-aware payment/payout timeline. Shows different information to neighbors
// vs teens/parents, and NEVER shows escrow or payout language for bookings
// where payment was never actually held.
//
// Key rules (from the booking state machine):
// - payment_status 'held' is only set by the verified Stripe webhook.
// - If payment_status is 'unpaid' or 'payment_failed', no money was captured.
// - The neighbor never sees payout/withdraw steps — those are the teen's/parent's.
export default function PaymentStatusTracker({ booking, isBuyer, isTeen, isParent }) {
  const { payment_status, payout_status } = booking;
  if (!payment_status) return null;

  // Unpaid or failed — no escrow/payout language. The ResumePaymentDialog
  // and "Payment incomplete" banner handle these states.
  if (payment_status === "unpaid" || payment_status === "payment_failed") {
    return null;
  }

  // Refunded — show the refund message.
  if (payment_status === "refunded") {
    return (
      <div className="mt-4 flex items-center gap-2 bg-slate-50 rounded-xl p-3 text-sm text-slate-600">
        <RotateCcw className="w-4 h-4 text-slate-400" />
        Payment refunded to {booking.buyer_name || "the neighbor"}. Refunds appear on the card in 5–10 business days.
      </div>
    );
  }

  // Neighbor: simple escrow confirmation, NO payout steps.
  // The neighbor should never see "Released", "withdraw", or "Transferred to bank".
  if (isBuyer && !isTeen && !isParent) {
    if (payment_status === "held") {
      return (
        <div className="mt-4 flex items-center gap-2 bg-emerald-50 rounded-xl p-3 text-sm text-emerald-700">
          <Lock className="w-4 h-4 text-emerald-500" />
          Your payment is held securely in escrow until the job is done.
        </div>
      );
    }
    if (payment_status === "releasing" || payment_status === "released") {
      return (
        <div className="mt-4 flex items-center gap-2 bg-emerald-50 rounded-xl p-3 text-sm text-emerald-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          Payment released to {booking.teen_display_name || "the teen"}'s parent.
        </div>
      );
    }
    return null;
  }

  // Teen/parent: full payout timeline with real state.
  // Steps are only marked done when each one has really happened.
  const steps = [
    { key: "held", label: "Payment held", detail: "Funds are held securely in escrow until the job is done." },
    { key: "released", label: "Released — ready to withdraw", detail: releasedDetail(payout_status) },
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
  if (payoutStatus === "pending_release" || payoutStatus === "awaiting_settlement" || payoutStatus === "not_started")
    return "Payment is held until the job is complete — then it settles for about 7 days before the parent can withdraw it to their bank.";
  if (payoutStatus === "blocked_no_destination")
    return "Waiting for the parent to connect a bank account in Payouts.";
  if (payoutStatus === "awaiting_active_account" || payoutStatus === "awaiting_bank")
    return "Waiting for the parent's bank setup to finish in Payouts.";
  if (payoutStatus === "awaiting_new_account_hold" || payoutStatus === "pending_new_account_hold")
    return "New account security hold — first payouts release 72 hours after bank setup.";
  if (payoutStatus === "pending_review")
    return "Under review — usually clears within 24 hours.";
  if (payoutStatus === "duplicate_blocked")
    return "This payout was already sent.";
  return "Sent — arrives in the parent's bank in 1–2 business days.";
}