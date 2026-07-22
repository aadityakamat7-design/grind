import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Landmark, CheckCircle2, AlertCircle, Loader2, Lock } from "lucide-react";

// Stripe Connect Express bank linking. The parent enters bank details directly
// with Stripe — the app only ever stores the account id, status, and masked last 4.
export default function ConnectBankCard({ profile, onUpdated, returnPath = "/parent/payouts" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connect")) {
      (async () => {
        setBusy(true);
        await base44.functions.invoke("checkConnectStatus", {});
        window.history.replaceState({}, "", window.location.pathname);
        setBusy(false);
        onUpdated?.();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    setBusy(true);
    setError("");
    const res = await base44.functions.invoke("createConnectOnboarding", { returnPath });
    setBusy(false);
    if (!res.data?.url) {
      setError(res.data?.error || "Could not start bank setup. Please try again.");
      return;
    }
    if (window.self !== window.top) {
      alert("Bank setup runs on Stripe's secure page and only works from the published app. Open the app in its own tab.");
      return;
    }
    window.location.href = res.data.url;
  };

  const refresh = async () => {
    setBusy(true);
    await base44.functions.invoke("checkConnectStatus", {});
    setBusy(false);
    onUpdated?.();
  };

  const status = profile?.connect_status || "not_setup";

  if (busy)
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-700">Talking to Stripe…</p>
      </div>
    );

  if (status === "active")
    return (
      <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <Landmark className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              {profile.bank_name || "Bank account"} ••••{profile.bank_last4 || "????"}
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </p>
            <p className="text-xs text-slate-500">Verified — payouts enabled. Transfers arrive in 1–2 business days.</p>
          </div>
        </div>
      </div>
    );

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
        <Landmark className="w-7 h-7 text-blue-500" />
      </div>
      <h3 className="font-bold text-slate-900">
        {status === "pending" ? "Finish setting up your bank" : status === "restricted" ? "Your payout account needs attention" : "Connect your bank account"}
      </h3>
      <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
        {status === "restricted"
          ? "Stripe needs more information before payouts can resume. Continue on Stripe to fix it."
          : "You'll enter your bank details directly with Stripe — we never see or store your account or routing numbers."}
      </p>
      {error && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700 mt-3 text-left">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
        </div>
      )}
      <Button className="rounded-xl mt-4 w-full" disabled={!profile?.is_identity_verified} onClick={start}>
        {status === "pending" || status === "restricted" ? "Continue on Stripe" : "Set up payouts with Stripe"}
      </Button>
      {status !== "not_setup" && (
        <Button variant="outline" className="rounded-xl mt-2 w-full" onClick={refresh}>
          Refresh status
        </Button>
      )}
      {!profile?.is_identity_verified && (
        <p className="text-xs text-amber-600 font-semibold mt-2">Identity verification is required before payouts can be enabled.</p>
      )}
      <p className="text-xs text-slate-400 flex items-center justify-center gap-1 mt-3">
        <Lock className="w-3 h-3" /> Powered by Stripe Connect
      </p>
    </div>
  );
}