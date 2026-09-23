import React from "react";
import { Landmark } from "lucide-react";

const fmt = (n) => `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PAYOUT_STATUS = {
  pending_release: { label: "Held until the job is complete", color: "#F2B84B" },
  blocked_no_destination: { label: "Waiting for bank setup", color: "#FF4D4D" },
  awaiting_active_account: { label: "Waiting for bank setup to finish", color: "#F2B84B" },
  awaiting_new_account_hold: { label: "New account hold — 72 hours", color: "#F2B84B" },
  pending_review: { label: "Under review — usually clears within 24 hours", color: "#F2B84B" },
  duplicate_blocked: { label: "Already sent", color: "#00D47E" },
  transferred: { label: "Sent — arrives in 1–2 business days", color: "#00D47E" },
  paid_out: { label: "In your bank", color: "#00D47E" },
  // Legacy
  awaiting_settlement: { label: "Held until the job is complete", color: "#F2B84B" },
  awaiting_bank: { label: "Waiting for bank setup to finish", color: "#F2B84B" },
  pending_new_account_hold: { label: "New account hold — 72 hours", color: "#F2B84B" },
  not_started: { label: "Released", color: "#00D47E" },
};

// Shown only when the teen is in withdrawal mode (parent's payout account is
// active). Summarizes where each released payout stands — in the bank, in
// transit, under review, or still held.
export default function PayoutStatusSection({ releasedBookings }) {
  if (!releasedBookings || releasedBookings.length === 0) return null;

  // Group released bookings by payout status
  const groups = {};
  releasedBookings.forEach((b) => {
    const key = b.payout_status || "pending_release";
    if (!groups[key]) groups[key] = { count: 0, total: 0, bookings: [] };
    groups[key].count += 1;
    groups[key].total += b.net_amount || 0;
    groups[key].bookings.push(b);
  });

  // Order: arrived first, then transit, then review/holds, then issues
  const order = [
    "paid_out",
    "transferred",
    "duplicate_blocked",
    "not_started",
    "pending_review",
    "awaiting_new_account_hold",
    "pending_new_account_hold",
    "awaiting_active_account",
    "awaiting_bank",
    "awaiting_settlement",
    "pending_release",
    "blocked_no_destination",
  ];
  const sortedKeys = Object.keys(groups).sort(
    (a, b) => order.indexOf(a) - order.indexOf(b)
  );

  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className="flex items-center gap-2 mb-4">
        <Landmark className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Payout Status</h2>
      </div>
      <div className="space-y-2">
        {sortedKeys.map((key) => {
          const g = groups[key];
          const st = PAYOUT_STATUS[key] || PAYOUT_STATUS.pending_release;
          return (
            <div
              key={key}
              className="flex items-center justify-between rounded-xl p-3.5 bg-secondary/60"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{st.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {g.count} {g.count === 1 ? "job" : "jobs"}
                </p>
              </div>
              <span
                className="text-sm font-semibold tabular-nums"
                style={{ color: st.color }}
              >
                {fmt(g.total)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
        Payouts route to your parent's bank account. Tap any transaction below to open its booking.
      </p>
    </div>
  );
}