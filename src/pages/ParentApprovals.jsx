import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, MapPin, CalendarDays, FileText, Lock } from "lucide-react";
import { format } from "date-fns";
import EmptyState from "@/components/grind/EmptyState";
import PageHeader from "@/components/grind/PageHeader";
import { money } from "@/lib/grind";
import { useApprovalWithVerification } from "@/hooks/useApprovalWithVerification";
import ErrorRetry from "@/components/grind/ErrorRetry";

export default function ParentApprovals() {
  const { user } = useOutletContext();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [profile, setProfile] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(false);
      const [data, profiles] = await Promise.all([
        base44.entities.Booking.filter(
          { parent_user_id: user.id, status: "pending_parent_approval" },
          "-created_date"
        ),
        base44.entities.ParentProfile.filter({ user_id: user.id }),
      ]);
      setPending(data);
      setProfile(profiles[0] || null);
    } catch (err) {
      console.error("ParentApprovals load failed:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = base44.entities.Booking.subscribe(() => load());
    return unsub;
  }, [load]);

  const { attempt, acting } = useApprovalWithVerification(profile, load);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasSetup = params.get("setup");
    if (!hasSetup) return;
    if (loading) return;
    if (pending.length === 0) {
      window.location.replace("/parent");
      return;
    }
    window.history.replaceState({}, "", window.location.pathname);
  }, [pending, loading]);

  if (loading)
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-card rounded-2xl border border-border p-5 h-32 skeleton-shimmer" />)}
      </div>
    );
  if (error) return <ErrorRetry onRetry={load} />;

  return (
    <div className="space-y-5">
      <PageHeader title="Approvals" subtitle="Every booking needs your OK before it's confirmed." />

      {pending.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="All clear" subtitle="No bookings are waiting for your approval." />
      ) : (
        <div className="space-y-4">
          {pending.map((b) => {
            return (
              <div key={b.id} className="bg-card rounded-2xl border border-border shadow-soft p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-foreground text-[15px]">{b.listing_title}</h3>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      {b.teen_display_name} · booked by {b.buyer_name}
                    </p>
                  </div>
                  <p className="font-extrabold text-foreground text-[16px] shrink-0">{money(b.price_total)}</p>
                </div>
                <div className="mt-3 space-y-1.5 text-[13px] text-muted-foreground">
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

                <p className="text-[12px] text-muted-foreground/70 mt-3">
                  No payment yet — the neighbor pays when both sides start the job. Denying cancels the booking.
                </p>
                {profile?.connect_status !== "active" && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-[12px] text-amber-700 mt-3">
                    <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      <strong className="font-semibold">Earnings will be locked.</strong> Your teen can do this job, but their earnings won't be withdrawable until you{" "}
                      <a href="/parent" className="underline font-semibold">connect your bank account</a>.
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <Button
                    variant="outline"
                    className="rounded-full h-11"
                    disabled={acting === b.id}
                    onClick={() => attempt(b, false)}
                  >
                    Deny & refund
                  </Button>
                  <Button className="rounded-full h-11" disabled={acting === b.id} onClick={() => attempt(b, true)}>
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