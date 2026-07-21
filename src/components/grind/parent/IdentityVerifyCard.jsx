import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, AlertCircle, ScanFace, Loader2 } from "lucide-react";

export default function IdentityVerifyCard({ onVerified }) {
  const returned = new URLSearchParams(window.location.search).get("identity_return") === "1";
  const [status, setStatus] = useState(returned ? "checking" : "idle"); // idle | starting | checking | processing | failed
  const [error, setError] = useState("");

  const check = useCallback(async () => {
    setStatus("checking");
    const res = await base44.functions.invoke("checkIdentityStatus", {});
    const s = res.data?.status;
    if (s === "verified") { onVerified?.(); return; }
    if (s === "failed") { setError(res.data?.reason || ""); setStatus("failed"); return; }
    setStatus(s === "processing" ? "processing" : "idle");
  }, [onVerified]);

  useEffect(() => { if (returned) check(); }, [returned, check]);

  const start = async () => {
    if (window.self !== window.top) {
      setError("Identity verification opens a secure Stripe page and only works outside the preview — open the published app in its own tab to continue.");
      return;
    }
    setStatus("starting");
    setError("");
    const sep = window.location.search ? "&" : "?";
    const returnUrl = window.location.origin + window.location.pathname + window.location.search + sep + "identity_return=1";
    const res = await base44.functions.invoke("createIdentitySession", { returnUrl });
    if (res.data?.alreadyVerified) { onVerified?.(); return; }
    if (res.data?.url) { window.location.href = res.data.url; return; }
    setError("We couldn't start verification. Please try again.");
    setStatus("idle");
  };

  if (status === "checking")
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-700">Checking your verification result…</p>
      </div>
    );

  if (status === "processing")
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-700">Stripe is reviewing your ID and selfie…</p>
        </div>
        <p className="text-xs text-slate-500">This usually takes under a minute.</p>
        <Button variant="outline" className="rounded-xl w-full" onClick={check}>Check again</Button>
      </div>
    );

  if (status === "failed")
    return (
      <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-6 space-y-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-slate-900">We couldn't verify your identity</p>
            <p className="text-xs text-slate-500 mt-1">
              {error || "Your ID or selfie couldn't be confirmed."} Make sure your ID is valid and your face is clearly visible, then try again. If this keeps happening, contact Kickstart support from the Account page and we'll help you out.
            </p>
          </div>
        </div>
        <Button className="rounded-xl w-full" onClick={start}>Try again</Button>
      </div>
    );

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
        <ScanFace className="w-7 h-7 text-blue-600" />
      </div>
      <div>
        <h3 className="font-bold text-slate-900">Verify your identity</h3>
        <p className="text-sm text-slate-500 mt-1">
          To protect teens on Kickstart, every parent verifies who they are with a government-issued photo ID (driver's license, state ID, or passport) and a quick live selfie. Verification is handled securely by Stripe — we never store your ID photos.
        </p>
      </div>
      <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
        You'll be sent to a secure Stripe page and brought right back here when you're done.
      </div>
      {error && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
        </div>
      )}
      <Button className="w-full rounded-xl" disabled={status === "starting"} onClick={start}>
        {status === "starting" ? "Opening secure verification…" : "Verify my identity"}
      </Button>
    </div>
  );
}