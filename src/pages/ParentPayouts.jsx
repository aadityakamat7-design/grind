import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Wallet, ShieldCheck, Clock, CheckCircle2, Landmark } from "lucide-react";
import { format } from "date-fns";
import EmptyState from "@/components/grind/EmptyState";
import StripeIdentityCard from "@/components/grind/parent/StripeIdentityCard";
import ConnectBankCard from "@/components/grind/parent/ConnectBankCard";
import { money } from "@/lib/grind";

const PAYOUT_LABELS = {
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
  const [retrying, setRetrying] = useState(null);

  const load = useCallback(async () => {
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
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  const retryPayout = async (bookingId) => {
    setRetrying(bookingId);
    const res = await base44.functions.invoke("processPayout", { bookingId });
    if (res.data?.error) alert(res.data.error);
    setRetrying(null);
    load();
  };

  if (loading)
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" /></div>;

  const total = records.reduce((s, r) => s + (r.net_amount || 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Payouts</h1>
        <p className="text-sm text-slate-500 mt-1">All teen earnings pay out to your bank — never directly to your teen.</p>
      </div>

      {!profile?.is_identity_verified ? (
        <StripeIdentityCard onVerified={() => { window.history.replaceState({}, "", window.location.pathname); load(); }} />
      ) : (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <p className="text-sm font-semibold text-blue-900">Parent identity verified</p>
        </div>
      )}

      <ConnectBankCard profile={profile} onUpdated={load} />

      <div className="bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
        <p className="text-sm opacity-80">Total released to you</p>
        <p className="text-4xl font-extrabold mt-1">{money(total)}</p>
      </div>

      {records.length === 0 ? (
        <EmptyState icon={Wallet} title="No payouts yet" subtitle="When your teen completes jobs and payments are released, they'll appear here." />
      ) : (
        <div className="space-y-3">
          {records.map((r) => {
            const booking = r.booking_id ? payoutByBooking[r.booking_id] : null;
            const info = booking ? PAYOUT_LABELS[booking.payout_status] : null;
            const Icon = info?.icon;
            const canRetry = booking?.payout_status === "awaiting_bank" && profile?.connect_status === "active";
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{r.listing_title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {r.occurred_at ? format(new Date(r.occurred_at), "MMM d, yyyy") : ""}
                    </p>
                  </div>
                  <p className="font-extrabold text-emerald-600">+{money(r.net_amount)}</p>
                </div>
                {info && (
                  <p className={`flex items-center gap-1.5 text-xs font-semibold mt-2 ${info.cls}`}>
                    <Icon className="w-3.5 h-3.5" /> {info.text}
                  </p>
                )}
                {canRetry && (
                  <Button size="sm" variant="outline" className="rounded-xl mt-2" disabled={retrying === booking.id} onClick={() => retryPayout(booking.id)}>
                    {retrying === booking.id ? "Sending..." : "Send to my bank"}
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