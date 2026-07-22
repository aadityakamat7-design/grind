import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { money } from "@/lib/grind";

// Manual safety review for large or first-time payouts before money leaves the platform.
export default function PayoutReviewQueue({ bookings, onDone }) {
  const [acting, setActing] = useState(null);
  const pending = bookings.filter((b) => b.payout_status === "pending_review");

  const approve = async (b) => {
    setActing(b.id);
    const res = await base44.functions.invoke("processPayout", { bookingId: b.id });
    if (res.data?.error) alert(res.data.error);
    setActing(null);
    onDone?.();
  };

  return (
    <div>
      <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-500" /> Payout review {pending.length > 0 && `(${pending.length} waiting)`}
      </h2>
      {pending.length === 0 ? (
        <p className="text-sm text-slate-400">No payouts waiting for review.</p>
      ) : (
        <div className="space-y-2.5">
          {pending.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 bg-white rounded-2xl border border-amber-200 shadow-sm p-4">
              <div className="min-w-0">
                <p className="font-bold text-slate-900 text-sm truncate">{b.listing_title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {money((b.net_amount || 0) + (b.tip_amount || 0))} to parent · {b.payout_review_reason || "Safety review"}
                </p>
              </div>
              <Button size="sm" className="rounded-xl shrink-0" disabled={acting === b.id} onClick={() => approve(b)}>
                {acting === b.id ? "Sending..." : "Approve & transfer"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}