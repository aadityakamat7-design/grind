import React from "react";
import { Wallet } from "lucide-react";
import { money } from "@/lib/grind";

const PAYOUT_LABELS = {
  not_started: { label: "Pending", className: "bg-secondary text-muted-foreground border-border" },
  awaiting_bank: { label: "Awaiting bank", className: "bg-amber-100 text-amber-700 border-amber-200" },
  awaiting_settlement: { label: "Settling", className: "bg-secondary text-foreground border-border" },
  pending_review: { label: "Under review", className: "bg-amber-100 text-amber-700 border-amber-200" },
  transferred: { label: "Paid out", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function PayoutHistorySection({ bookings }) {
  const payouts = bookings
    .filter((b) => b.status === "completed")
    .sort((a, b) => new Date(b.released_at || b.teen_finished_at || b.scheduled_start || 0) - new Date(a.released_at || a.teen_finished_at || a.scheduled_start || 0));

  return (
    <section>
      <h2 className="text-[17px] font-bold text-foreground mb-3 flex items-center gap-2">
        <Wallet className="w-[18px] h-[18px] text-muted-foreground" /> Completed payouts
      </h2>
      {payouts.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-6 text-center">
          <p className="text-[14px] text-muted-foreground">No completed payouts yet — finished jobs and their payouts will appear here.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border shadow-soft divide-y divide-border overflow-hidden">
          {payouts.map((b) => {
            const meta = PAYOUT_LABELS[b.payout_status] || PAYOUT_LABELS.not_started;
            const date = b.released_at || b.teen_finished_at || b.scheduled_start;
            return (
              <div key={b.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-foreground truncate">{b.listing_title || "Untitled job"}</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">{formatDate(date)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[14px] font-bold text-foreground">{money(b.net_amount || 0)}</p>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium mt-1 ${meta.className}`}>
                    {meta.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}