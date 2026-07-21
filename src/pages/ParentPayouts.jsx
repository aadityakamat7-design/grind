import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Wallet, CheckCircle2, Landmark, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import EmptyState from "@/components/grind/EmptyState";
import IdentityVerifyCard from "@/components/grind/parent/IdentityVerifyCard";
import { money } from "@/lib/grind";

export default function ParentPayouts() {
  const { user } = useOutletContext();
  const [profile, setProfile] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [profiles, links] = await Promise.all([
      base44.entities.ParentProfile.filter({ user_id: user.id }),
      base44.entities.ParentTeenLink.filter({ parent_user_id: user.id, status: "confirmed" }),
    ]);
    const teenIds = links.map((l) => l.teen_user_id);
    const earnings = teenIds.length
      ? await base44.entities.EarningsRecord.filter({ teen_user_id: { $in: teenIds } }, "-occurred_at")
      : [];
    setProfile(profiles[0] || null);
    setRecords(earnings);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  const setupPayouts = async () => {
    setSaving(true);
    await base44.entities.ParentProfile.update(profile.id, { connect_status: "active" });
    setSaving(false);
    load();
  };

  if (loading)
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" /></div>;

  const total = records.reduce((s, r) => s + (r.net_amount || 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Payouts</h1>
        <p className="text-sm text-slate-500 mt-1">All teen earnings pay out to your account.</p>
      </div>

      {!profile?.is_identity_verified && (
        <IdentityVerifyCard onVerified={() => { window.history.replaceState({}, "", window.location.pathname); load(); }} />
      )}

      {profile?.is_identity_verified && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <p className="text-sm font-semibold text-blue-900">Parent identity verified</p>
        </div>
      )}

      {profile?.connect_status !== "active" ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Landmark className="w-7 h-7 text-blue-500" />
          </div>
          <h3 className="font-bold text-slate-900">Set up your payout account</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
            As the financial account holder, released job payments are transferred to you — never directly to your teen.
          </p>
          <Button className="rounded-xl mt-4" disabled={saving || !profile?.is_identity_verified} onClick={setupPayouts}>
            {saving ? "Setting up..." : "Set up payouts"}
          </Button>
          {!profile?.is_identity_verified && (
            <p className="text-xs text-amber-600 font-semibold mt-2">Identity verification is required before payouts can be enabled.</p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <p className="text-sm font-semibold text-emerald-800">Payout account active</p>
        </div>
      )}

      <div className="bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
        <p className="text-sm opacity-80">Total released to you</p>
        <p className="text-4xl font-extrabold mt-1">{money(total)}</p>
      </div>

      {records.length === 0 ? (
        <EmptyState icon={Wallet} title="No payouts yet" subtitle="When your teen completes jobs and payments are released, they'll appear here." />
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <div key={r.id} className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div>
                <p className="font-bold text-slate-900 text-sm">{r.listing_title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {r.occurred_at ? format(new Date(r.occurred_at), "MMM d, yyyy") : ""}
                </p>
              </div>
              <p className="font-extrabold text-emerald-600">+{money(r.net_amount)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}