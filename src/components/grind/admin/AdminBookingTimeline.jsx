import React from "react";
import { money } from "@/lib/grind";

// Full booking timeline for admins: every status change, when it happened, who
// triggered it, and the matching Stripe identifiers, so a support decision can
// be traced end to end.
const STEPS = [
  { key: "created", label: "Booking created", field: "created_date", actor: "buyer" },
  { key: "payment", label: "Payment captured (held)", field: "_paid_at", actor: "stripe" },
  { key: "parent", label: "Parent approved", field: "parent_started_at", actor: "parent" },
  { key: "teen_start", label: "Teen started", field: "teen_started_at", actor: "teen" },
  { key: "buyer_start", label: "Neighbor started", field: "buyer_started_at", actor: "buyer" },
  { key: "teen_finish", label: "Teen marked finished", field: "teen_finished_at", actor: "teen" },
  { key: "disputed", label: "Neighbor disputed", field: "buyer_disputed_at", actor: "buyer" },
  { key: "buyer_finish", label: "Neighbor confirmed done", field: "buyer_finished_at", actor: "buyer" },
  { key: "released", label: "Payment released", field: "released_at", actor: "system" },
  { key: "transferred", label: "Paid out to bank", field: "transferred_at", actor: "system" },
  { key: "admin", label: "Support action", field: "admin_action_at", actor: "admin" },
];

const ACTOR_LABEL = {
  buyer: "Neighbor",
  teen: "Teen",
  parent: "Parent",
  stripe: "Stripe webhook",
  system: "System",
  admin: "Blockwork admin",
};

export default function AdminBookingTimeline({ booking }) {
  const paidAt = ["held", "released", "releasing", "refunded"].includes(booking.payment_status)
    ? booking.created_date
    : null;

  const rows = STEPS
    .map((s) => ({
      ...s,
      date: s.field === "_paid_at" ? paidAt : booking[s.field],
    }))
    .filter((s) => s.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="space-y-3">
      <div className="space-y-2.5">
        {rows.map((s, i) => (
          <div key={`${s.key}-${i}`} className="flex items-start gap-3">
            <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-primary mt-1.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{s.label}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(s.date).toLocaleString()} · {ACTOR_LABEL[s.actor]}
              </p>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-xs text-muted-foreground">No recorded events yet.</p>
        )}
      </div>

      <div className="bg-secondary rounded-xl p-3 space-y-1 text-[11px] text-muted-foreground break-all">
        <p><span className="font-semibold text-foreground">Booking:</span> {booking.id}</p>
        {booking.stripe_session_id && (
          <p><span className="font-semibold text-foreground">Checkout session:</span> {booking.stripe_session_id}</p>
        )}
        {booking.stripe_payment_intent_id && (
          <p><span className="font-semibold text-foreground">Payment intent:</span> {booking.stripe_payment_intent_id}</p>
        )}
        {booking.tip_stripe_payment_intent_id && (
          <p><span className="font-semibold text-foreground">Tip intent:</span> {booking.tip_stripe_payment_intent_id}</p>
        )}
        {booking.stripe_transfer_id && (
          <p><span className="font-semibold text-foreground">Transfer:</span> {booking.stripe_transfer_id}</p>
        )}
        {booking.is_test_mode && <p className="text-amber-700 font-semibold">Test-mode booking — no real money</p>}
      </div>

      {(Number(booking.admin_refund_amount) > 0) && (
        <p className="text-xs text-muted-foreground">
          Support has refunded <span className="font-semibold text-foreground">{money(booking.admin_refund_amount)}</span> on this booking.
        </p>
      )}
    </div>
  );
}