import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, CalendarDays, MapPin } from "lucide-react";
import { format } from "date-fns";
import { money } from "@/lib/grind";
import IdentityVerificationGate from "@/components/grind/parent/IdentityVerificationGate";
import { useApprovalWithVerification } from "@/hooks/useApprovalWithVerification";

export default function ApprovalQueue({ pending, onDecided }) {
  const [profile, setProfile] = useState(null);

  const loadProfile = useCallback(async () => {
    const profiles = await base44.entities.ParentProfile.filter({});
    setProfile(profiles[0] || null);
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const { gateOpen, setGateOpen, attempt, onVerified, acting, initialStep } = useApprovalWithVerification(profile, onDecided);

  return (
    <div>
      <IdentityVerificationGate open={gateOpen} onOpenChange={setGateOpen} onVerified={onVerified} initialStep={initialStep} />

      <h2 className="font-bold text-foreground mb-3 flex items-center gap-1.5">
        <ShieldCheck className="w-4 h-4 text-muted-foreground" /> Approval queue
      </h2>
      {pending.length === 0 ? (
        <p className="text-sm text-muted-foreground">All clear — nothing is waiting for your approval.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((b) => {
            return (
              <div key={b.id} className="bg-secondary/60 border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-foreground text-sm">{b.listing_title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{b.teen_display_name} · booked by {b.buyer_name}</p>
                  </div>
                  <p className="font-extrabold text-foreground text-sm">{money(b.price_total)}</p>
                </div>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {b.scheduled_start && (
                    <p className="flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-muted-foreground/60" />
                      {format(new Date(b.scheduled_start), "EEE, MMM d 'at' h:mm a")}
                    </p>
                  )}
                  {b.address && (
                    <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-muted-foreground/60" /> {b.address}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2.5 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    disabled={acting === b.id}
                    onClick={() => attempt(b, false)}
                  >
                    Deny & refund
                  </Button>
                  <Button size="sm" className="rounded-xl" disabled={acting === b.id} onClick={() => attempt(b, true)}>
                    Approve
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}