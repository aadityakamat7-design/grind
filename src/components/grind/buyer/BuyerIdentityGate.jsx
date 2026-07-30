import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

// BuyerIdentityGate — shown before a buyer can book their first job.
// Starts a Stripe Identity session, redirects to Stripe's hosted verification,
// then polls for the result when the buyer returns.
export default function BuyerIdentityGate({ buyerProfile, onVerified }) {
  const [status, setStatus] = useState(buyerProfile?.id_verification_status || "pending");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [polling, setPolling] = useState(false);
  const pollRef = useRef(null);

  const startVerification = async () => {
    setStarting(true);
    setError("");
    try {
      const returnUrl = window.location.href;
      const res = await base44.functions.invoke("createBuyerIdentitySession", { returnUrl });
      if (res.data?.alreadyVerified) {
        setStatus("verified");
        onVerified?.();
        return;
      }
      if (res.data?.url) {
        window.location.href = res.data.url;
        return;
      }
      setError(res.data?.error || "Couldn't start verification. Please try again.");
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't start verification. Please try again.");
    } finally {
      setStarting(false);
    }
  };

  // When the buyer returns from Stripe, poll for the result
  useEffect(() => {
    if (status !== "processing" && status !== "pending") return;
    if (!buyerProfile?.identity_session_id && status !== "processing") return;

    let cancelled = false;
    const poll = async () => {
      setPolling(true);
      try {
        const res = await base44.functions.invoke("checkBuyerIdentityStatus", {});
        if (cancelled) return;
        const s = res.data?.status;
        if (s === "verified") {
          setStatus("verified");
          setPolling(false);
          onVerified?.();
          return;
        }
        if (s === "failed") {
          setStatus("failed");
          setError(res.data?.reason || "Verification did not pass. Please try again.");
          setPolling(false);
          return;
        }
        // Still processing — keep polling
        pollRef.current = setTimeout(poll, 3000);
      } catch (err) {
        if (cancelled) return;
        setPolling(false);
      }
    };
    pollRef.current = setTimeout(poll, 2000);
    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  if (status === "verified") {
    return (
      <div className="flex items-center gap-3 bg-emerald-50 rounded-xl p-4 text-sm text-emerald-700">
        <CheckCircle2 className="w-5 h-5 shrink-0" />
        <span className="font-medium">ID verified — you can book with confidence.</span>
      </div>
    );
  }

  if (status === "processing" || polling) {
    return (
      <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-4 text-sm text-slate-600">
        <Loader2 className="w-5 h-5 shrink-0 animate-spin" />
        <span className="font-medium">Checking your verification…</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-4 text-sm">
        <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-foreground" />
        <div>
          <p className="font-bold text-foreground">Verify your ID before booking</p>
          <p className="text-muted-foreground mt-1">
            For everyone's safety, neighbors must verify their identity with their government ID number before booking a teen. This is a one-time check powered by Stripe Identity.
          </p>
        </div>
      </div>
      {status === "failed" && (
        <div className="flex items-start gap-2 text-xs text-destructive font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error || "Verification didn't pass. Please try again."}</span>
        </div>
      )}
      {error && status !== "failed" && (
        <div className="flex items-start gap-2 text-xs text-destructive font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      <Button className="w-full rounded-xl" disabled={starting} onClick={startVerification}>
        {starting ? "Starting…" : "Verify my ID"}
      </Button>
    </div>
  );
}