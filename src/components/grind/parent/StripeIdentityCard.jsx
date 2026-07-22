import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, AlertCircle, Loader2, IdCard } from "lucide-react";

// Stripe Identity hosted verification: real government ID + liveness selfie,
// checked by Stripe on their site. All status updates happen server-side.
export default function StripeIdentityCard({ onVerified }) {
  const [status, setStatus] = useState("idle"); // idle | starting | checking | processing | failed
  const [error, setError] = useState("");

  const checkStatus = useCallback(async () => {
    setStatus("checking");
    const res = await base44.functions.invoke("checkIdentityStatus", {});
    const s = res.data?.status;
    if (s === "verified") { onVerified?.(); return; }
    if (s === "failed") {
      setError(res.data?.reason || "Verification didn't pass. Please try again.");
      setStatus("failed");
      return;
    }
    if (s === "processing" || s === "requires_input") { setStatus("processing"); return; }
    setStatus("idle");
  }, [onVerified]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("identity_return")) checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    setStatus("starting");
    setError("");
    const returnUrl = `${window.location.origin}${window.location.pathname}?identity_return=1`;
    const res = await base44.functions.invoke("createIdentitySession", { returnUrl });
    if (res.data?.alreadyVerified) { onVerified?.(); return; }
    if (!res.data?.url) {
      setError(res.data?.error || "Could not start verification. Please try again.");
      setStatus("failed");
      return;
    }
    if (window.self !== window.top) {
      alert("ID verification runs on Stripe's secure page and only works from the published app. Open the app in its own tab to verify.");
      setStatus("idle");
      return;
    }
    window.location.href = res.data.url;
  };

  if (status === "checking" || status === "starting")
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-700">
          {status === "starting" ? "Opening Stripe's secure verification…" : "Checking your verification result…"}
        </p>
      </div>
    );

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
        <IdCard className="w-7 h-7 text-blue-600" />
      </div>
      <div>
        <h3 className="font-bold text-slate-900">Verify your identity</h3>
        <p className="text-sm text-slate-500 mt-1">
          To protect teens, every parent verifies with a real government-issued photo ID and a live selfie.
          Verification happens on Stripe's secure page — we never see or store your ID images.
        </p>
      </div>
      {status === "processing" && (
        <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-900 flex items-start gap-2">
          <Loader2 className="w-4 h-4 shrink-0 mt-0.5 animate-spin" />
          <span>Stripe is still reviewing your documents — this usually takes a minute or two.</span>
        </div>
      )}
      {(status === "failed" || error) && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
        Have your driver's license, state ID, or passport ready, plus your phone camera for the selfie check.
      </div>
      <div className="grid gap-2">
        <Button className="w-full rounded-xl" onClick={start}>
          {status === "failed" ? "Try verification again" : "Verify with Stripe"}
        </Button>
        {status === "processing" && (
          <Button variant="outline" className="w-full rounded-xl" onClick={checkStatus}>
            Check status again
          </Button>
        )}
      </div>
    </div>
  );
}