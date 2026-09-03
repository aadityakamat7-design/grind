import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Wallet, Clock, CheckCircle2, Landmark, Bot, ArrowDownToLine } from "lucide-react";
import { format } from "date-fns";
import EmptyState from "@/components/grind/EmptyState";
import PageHeader from "@/components/grind/PageHeader";
import { money } from "@/lib/grind";
import { toast } from "@/components/ui/use-toast";
import ErrorRetry from "@/components/grind/ErrorRetry";

const PAYOUT_LABELS = {
  awaiting_settlement: { text: "Ready to withdraw — tap below to send to your bank", cls: "text-amber-600", icon: Clock },
  transferred: { text: "In your bank in 1–2 business days", cls: "text-emerald-600", icon: CheckCircle2 },
  pending_review: { text: "Safety review — usually within 1 day", cls: "text-amber-600", icon: Clock },
  awaiting_bank: { text: "Waiting for your bank connection", cls: "text-rose-600", icon: Landmark },
};

export default function ParentPayouts() {
  const { user } = useOutletContext();
  const [profile, setProfile] = useState(null);
  const [records, setRecords] = useState([]);
  const [payoutByBooking, setPayoutByBooking] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retrying, setRetrying] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(false);
      const [profiles, links, released] = await Promise.all([
        base44.entities.ParentProfile.filter({ user_id: user.id }),
        base44.entities.ParentTeenLink.filter({ parent_user_id: user.id, status: "confirmed" }),
        base44.entities.Booking.filter({ parent_user_id: user.id, payment_status: "released" }),
      ]);
      const teenIds = links.map((l) => l.teen_user_id);
      const earnings = teenIds.length
        ? await base44.entities.EarningsRecord.filter({ teen_user_id: { $in: teenIds } }, "-occurred_at")
        : [];
      setProfile(profiles[0] || null);
      setRecords(earnings);
      setPayoutByBooking(Object.fromEntries(released.map((b) => [b.id, b])));
    } catch (err) {
      console.error("ParentPayouts load failed:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsubBook = base44.entities.Booking.subscribe(() => load());
    const unsubEarn = base44.entities.EarningsRecord.subscribe(() => load());
    return () => { unsubBook(); unsubEarn(); };
  }, [load]);

  const retryPayout = async (bookingId) => {
    setRetrying(bookingId);
    try {
      const res = await base44.functions.invoke("processPayout", { bookingId });
      if (res.data?.error) {
        toast({ title: "Payout failed", description: res.data.error, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Payout failed", description: err.response?.data?.error || "Something went wrong.", variant: "destructive" });
    }
    setRetrying(null);
    load();
  };

  const eligibleBookings = Object.values(payoutByBooking).filter((b) => {
    const settlementReady = b.payout_status === "awaiting_settlement"
      && b.payout_eligible_at
      && new Date(b.payout_eligible_at) <= new Date();
    return (b.payout_status === "awaiting_bank" || settlementReady);
  });
  const canBatch = eligibleBookings.length > 0 && profile?.connect_status === "active";
  const [batching, setBatching] = useState(false);

  const batchWithdraw = async () => {
    setBatching(true);
    let ok = 0;
    let fail = 0;
    for (const b of eligibleBookings) {
      try {
        const res = await base44.functions.invoke("processPayout", { bookingId: b.id });
        if (res.data?.error) fail++; else ok++;
      } catch {
        fail++;
      }
    }
    setBatching(false);
    load();
    if (ok > 0 && fail === 0) {
      toast({ title: `${ok} payout${ok > 1 ? "s" : ""} sent`, description: "Funds arrive in 1–2 business days." });
    } else if (ok > 0 && fail > 0) {
      toast({ title: `${ok} sent, ${fail} failed`, description: "Some payouts couldn't be processed — try again.", variant: "destructive" });
    } else if (fail > 0) {
      toast({ title: "Payouts failed", description: "Couldn't process withdrawals — try again.", variant: "destructive" });
    }
  };

  if (loading)
    return (
      <div className="space-y-5">
        <div className="h-8 w-40 rounded-lg bg-muted skeleton-shimmer" />
        <div className="bg-card rounded-2xl border border-border h-32 skeleton-shimmer" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-card rounded-2xl border border-border h-20 skeleton-shimmer" />)}
        </div>
      </div>
    );
  if (error) return <ErrorRetry onRetry={load} />;

  const total = records.reduce((s, r) => s + (r.net_amount || 0), 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Payouts" subtitle="All teen earnings pay out to your bank — never directly to your teen." />

      <div className="bg-gradient-to-br from-foreground to-primary rounded-2xl p-6 text-primary-foreground shadow-card">
        <p className="text-[13px] opacity-80">Total released to you</p>
        <p className="text-[40px] font-extrabold mt-1.5 tracking-tight">{money(total)}</p>
      </div>

      {canBatch && (
        <Button className="w-full rounded-full h-12 text-base" disabled={batching} onClick={batchWithdraw}>
          {batching ? (
            <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" /> Processing withdrawals...</>
          ) : (
            <><ArrowDownToLine className="w-4 h-4 mr-1.5" /> Withdraw {money(eligibleBookings.reduce((s, b) => s + (b.net_amount || 0), 0))} to bank</>
          )}
        </Button>
      )}

      <Link to="/withdrawal-assistant">
        <Button variant="outline" className="w-full rounded-full h-11">
          <Bot className="w-4 h-4 mr-1.5" /> Ask the Withdrawal Assistant
        </Button>
      </Link>

      {records.length === 0 ? (
        <EmptyState icon={Wallet} title="No payouts yet" subtitle="When your teen completes jobs and payments are released, they'll appear here." />
      ) : (
        <div className="space-y-3">
          {records.map((r) => {
            const booking = r.booking_id ? payoutByBooking[r.booking_id] : null;
            const info = booking ? PAYOUT_LABELS[booking.payout_status] : null;
            const Icon = info?.icon;
            const settlementReady = booking?.payout_status === "awaiting_settlement"
              && booking?.payout_eligible_at
              && new Date(booking.payout_eligible_at) <= new Date();
            const canRetry = (booking?.payout_status === "awaiting_bank" || settlementReady)
              && profile?.connect_status === "active";
            return (
              <div key={r.id} className="bg-card rounded-2xl border border-border shadow-soft p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-bold text-foreground text-[14px] truncate">{r.listing_title}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      {r.occurred_at ? format(new Date(r.occurred_at), "MMM d, yyyy") : ""}
                    </p>
                  </div>
                  <p className="font-extrabold text-emerald-600 shrink-0">+{money(r.net_amount)}</p>
                </div>
                {info && (
                  <p className={`flex items-center gap-1.5 text-[12px] font-semibold mt-2.5 ${info.cls}`}>
                    <Icon className="w-3.5 h-3.5" /> {info.text}
                  </p>
                )}
                {canRetry && (
                  <Button size="sm" className="rounded-full mt-2.5" disabled={retrying === booking.id} onClick={() => retryPayout(booking.id)}>
                    {retrying === booking.id ? "Sending..." : (<><ArrowDownToLine className="w-3.5 h-3.5 mr-1" /> Withdraw to bank</>)}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}