import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert, MapPin, CalendarDays, FileText, IdCard } from "lucide-react";
import { format } from "date-fns";
import EmptyState from "@/components/grind/EmptyState";
import { money } from "@/lib/grind";
import IdentityVerificationGate from "@/components/grind/parent/IdentityVerificationGate";
import { useApprovalWithVerification } from "@/hooks/useApprovalWithVerification";

export default function ParentApprovals() {
  const { user } = useOutletContext();
  const [pending, setPending] = useState([]);
  const [teenProfiles, setTeenProfiles] = useState({});
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState(null);

  const load = useCallback(async () => {
    const [data, profiles] = await Promise.all([
      base44.entities.Booking.filter(
        { parent_user_id: user.id, status: "pending_parent_approval" },
        "-created_date"
      ),
      base44.entities.ParentProfile.filter({ user_id: user.id }),
    ]);
    setPending(data);
    setProfile(profiles[0] || null);
    // Load each pending booking's teen profile to surface identity status
    const teenIds = [...new Set(data.map((b) => b.teen_user_id).filter(Boolean))];
    const teenProfileResults = await Promise.all(
      teenIds.map((tid) => base44.entities.TeenProfile.filter({ user_id: tid }))
    );
    const map = {};
    teenIds.forEach((tid, i) => { map[tid] = teenProfileResults[i]?.[0] || null; });
    setTeenProfiles(map);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  const { gateOpen, setGateOpen, attempt, onVerified, acting } = useApprovalWithVerification(profile, load);

  if (loading)
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <IdentityVerificationGate open={gateOpen} onOpenChange={setGateOpen} onVerified={onVerified} />

      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Approvals</h1>
        <p className="text-sm text-muted-foreground mt-1">Every booking needs your OK before it's confirmed.</p>
      </div>

      {pending.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="All clear" subtitle="No bookings are waiting for your approval." />
      ) : (
        <div className="space-y-4">
          {pending.map((b) => {
            const teenProfile = teenProfiles[b.teen_user_id];
            const teenVerified = teenProfile?.identity_status === "verified";
            return (
              <div key={b.id} className="bg-card rounded-2xl border border-border shadow-soft p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-foreground">{b.listing_title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {b.teen_display_name} · booked by {b.buyer_name}
                    </p>
                  </div>
                  <p className="font-extrabold text-foreground">{money(b.price_total)}</p>
                </div>
                <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  {b.scheduled_start && (
                    <p className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-muted-foreground/60" />
                      {format(new Date(b.scheduled_start), "EEEE, MMM d 'at' h:mm a")}
                    </p>
                  )}
                  {b.address && (
                    <p className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground/60" />
                      {b.address}
                    </p>
                  )}
                  {b.notes && (
                    <p className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground/60 mt-0.5" />
                      {b.notes}
                    </p>
                  )}
                </div>

                {/* Teen identity verification status — the parent reviews
                    both the teen's identity and the job before approving. */}
                <div className={`mt-3 flex items-start gap-2 rounded-xl p-3 text-xs ${teenVerified ? "bg-secondary text-muted-foreground" : "bg-secondary/60 text-muted-foreground"}`}>
                  {teenVerified ? (
                    <><IdCard className="w-4 h-4 shrink-0 mt-0.5" /><span><span className="font-semibold text-foreground">{b.teen_display_name}'s identity is verified.</span> You can approve this job.</span></>
                  ) : (
                    <><ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" /><span><span className="font-semibold text-foreground">Waiting for {b.teen_display_name} to verify their identity.</span> They were prompted when they accepted — you can approve once they're verified. You can deny now if you prefer.</span></>
                  )}
                </div>

                <p className="text-xs text-muted-foreground/70 mt-3">
                  No payment yet — the neighbor pays when both sides start the job. Denying cancels the booking.
                </p>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    disabled={acting === b.id}
                    onClick={() => attempt(b, false)}
                  >
                    Deny & refund
                  </Button>
                  <Button className="rounded-xl" disabled={acting === b.id || !teenVerified} onClick={() => attempt(b, true)}>
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