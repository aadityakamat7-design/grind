import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import { Image } from "@/components/ui/image";
import { money } from "@/lib/grind";

// Admin review queue for disputed jobs. The admin sees the teen's completion
// photos and the neighbor's dispute reason, then decides whether to release
// the payment to the teen's parent or refund the neighbor.
export default function DisputeReviewQueue({ bookings, onDone }) {
  const [acting, setActing] = useState(null);
  const disputed = bookings.filter((b) => b.status === "disputed");

  const resolve = async (b, decision) => {
    setActing(b.id + decision);
    try {
      const res = await base44.functions.invoke("resolveDispute", { bookingId: b.id, decision });
      if (res.data?.error) alert(res.data.error);
    } catch (err) {
      alert(err.response?.data?.error || "Something went wrong.");
    }
    setActing(null);
    onDone?.();
  };

  return (
    <div>
      <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-rose-500" /> Disputed jobs {disputed.length > 0 && `(${disputed.length} waiting)`}
      </h2>
      {disputed.length === 0 ? (
        <p className="text-sm text-muted-foreground">No disputed jobs to review.</p>
      ) : (
        <div className="space-y-3">
          {disputed.map((b) => (
            <div key={b.id} className="bg-card rounded-2xl border border-rose-200 shadow-soft p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-foreground text-sm truncate">{b.listing_title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {b.teen_display_name} · {b.buyer_name} · {money((b.net_amount || 0) + (b.tip_amount || 0))}
                  </p>
                </div>
              </div>
              {b.completion_photos?.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {b.completion_photos.map((url) => (
                    <div key={url} className="aspect-square rounded-lg overflow-hidden border border-border">
                      <Image src={url} alt="Proof" className="w-full h-full" fittingType="fill" />
                    </div>
                  ))}
                </div>
              )}
              {b.dispute_reason && (
                <p className="text-xs text-muted-foreground bg-secondary rounded-lg p-2.5 italic">"{b.dispute_reason}"</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" className="rounded-xl" disabled={acting === b.id + "release"} onClick={() => resolve(b, "release")}>
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  {acting === b.id + "release" ? "Releasing..." : "Release to teen"}
                </Button>
                <Button size="sm" variant="outline" className="rounded-xl text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive" disabled={acting === b.id + "refund"} onClick={() => resolve(b, "refund")}>
                  <XCircle className="w-4 h-4 mr-1.5" />
                  {acting === b.id + "refund" ? "Refunding..." : "Refund neighbor"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}