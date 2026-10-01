import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tag } from "lucide-react";
import { CATEGORY_LABELS, money } from "@/lib/grind";

// One service a teen posted that is hidden from neighbors until their linked
// parent approves it. Approving publishes it; declining keeps it hidden and
// tells the teen why.
export default function ListingApprovalCard({ listing, onDecided }) {
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const decide = async (approve) => {
    setWorking(true);
    setError("");
    try {
      const res = await base44.functions.invoke("decideListing", {
        listingId: listing.id,
        approve,
        reason: approve ? "" : reason,
      });
      const data = res?.data || res;
      if (data?.error) {
        setError(data.error);
        setWorking(false);
        return;
      }
      onDecided?.();
    } catch (err) {
      setError(err?.response?.data?.error || err?.data?.error || "Something went wrong. Please try again.");
      setWorking(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" /> New service
          </p>
          <h3 className="font-bold text-foreground mt-0.5 text-[15px]">{listing.title}</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {listing.teen_display_name} · {CATEGORY_LABELS[listing.category] || listing.category}
          </p>
        </div>
        <p className="font-extrabold text-foreground shrink-0 text-[16px]">
          {money(listing.price)}
          <span className="text-[11px] text-muted-foreground font-medium">{listing.price_model === "HOURLY" ? "/hr" : ""}</span>
        </p>
      </div>

      {listing.description && (
        <p className="text-[13px] text-foreground/90 leading-relaxed mt-3">{listing.description}</p>
      )}
      <p className="text-[12px] text-muted-foreground/70 mt-3">
        This service is hidden from neighbors until you approve it. Approving means neighbors can book it — you still
        approve every job before any work happens.
      </p>

      {declining && (
        <div className="mt-3">
          <Label className="text-foreground text-xs">Why not? (optional — your teen will see this)</Label>
          <Input
            className="rounded-xl mt-1"
            maxLength={200}
            placeholder="e.g. Not this price"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      )}

      {error && <p className="text-[12px] text-destructive mt-3">{error}</p>}

      <div className="grid grid-cols-2 gap-3 mt-4">
        {declining ? (
          <>
            <Button variant="outline" className="rounded-full h-11" disabled={working} onClick={() => setDeclining(false)}>
              Cancel
            </Button>
            <Button variant="destructive" className="rounded-full h-11" disabled={working} onClick={() => decide(false)}>
              {working ? "Declining…" : "Decline service"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" className="rounded-full h-11" disabled={working} onClick={() => setDeclining(true)}>
              Decline
            </Button>
            <Button className="rounded-full h-11" disabled={working} onClick={() => decide(true)}>
              {working ? "Approving…" : "Approve service"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}