import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, AlertCircle, Loader2, IdCard, LifeBuoy, Landmark, CheckCircle2 } from "lucide-react";

// Multi-step gate shown when a parent tries to approve a booking before they
// are identity-verified and have a payout account.
//   Step "verify": Stripe Identity (government ID + liveness)
//   Step "bank":   Stripe Connect Express bank linking
//   Step "done":   Brief confirmation, then the pending approval completes
export default function IdentityVerificationGate({ open, onOpenChange, onVerified, initialStep = "verify" }) {
  const [step, setStep] = useState(initialStep);
  const [status, setStatus] = useState("idle"); // idle | starting | checking | processing | failed
  const [error, setError] = useState("");

  // Reset to the initial step whenever the gate opens
  useEffect(() => {
    if (open) {
      setStep(initialStep);
      setStatus("idle");
      setError("");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkIdentityStatus = useCallback(async () => {
    setStatus("checking");
    setError("");
    try {
      const res = await base44.functions.invoke("checkIdentityStatus", {});
      const s = res.data?.status;
      if (s === "verified") { setStep("bank"); setStatus("idle"); return; }
      if (s === "failed") {
        setError(res.data?.reason || "Verification didn't pass. Please try again.");
        setStatus("failed");
        return;
      }
      if (s === "processing" || s === "requires_input") { setStatus("processing"); return; }
      setStatus("idle");
    } catch (err) {
      setError(err.response?.data?.error || "We couldn't check your verification status. Please try again.");
      setStatus("failed");
    }
  }, []);

  const checkConnectStatus = useCallback(async () => {
    setStatus("checking");
    setError("");
    try {
      await base44.functions.invoke("checkConnectStatus", {});
      setStep("done");
      setStatus("idle");
      setTimeout(() => { onVerified?.(); }, 1200);
    } catch (err) {
      setError(err.response?.data?.error || "We couldn't confirm your bank connection.");
      setStatus("failed");
    }
  }, [onVerified]);

  // Handle redirect returns from Stripe
  useEffect(() => {
    if (!open) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("identity_return")) {
      window.history.replaceState({}, "", window.location.pathname);
      checkIdentityStatus();
    } else if (params.get("connect")) {
      window.history.replaceState({}, "", window.location.pathname);
      checkConnectStatus();
    }
  }, [open, checkIdentityStatus, checkConnectStatus]);

  const startIdentity = async () => {
    setStatus("starting");
    setError("");
    const returnUrl = `${window.location.origin}${window.location.pathname}?identity_return=1`;
    try {
      const res = await base44.functions.invoke("createIdentitySession", { returnUrl });
      if (res.data?.alreadyVerified) { setStep("bank"); setStatus("idle"); return; }
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
    } catch (err) {
      setError(err.response?.data?.error || "Could not start verification. Please try again.");
      setStatus("failed");
    }
  };

  const startBank = async () => {
    setStatus("starting");
    setError("");
    try {
      const res = await base44.functions.invoke("createConnectOnboarding", { returnPath: window.location.pathname });
      if (!res.data?.url) {
        setError(res.data?.error || "Could not start bank setup. Please try again.");
        setStatus("failed");
        return;
      }
      if (window.self !== window.top) {
        alert("Bank setup runs on Stripe's secure page and only works from the published app. Open the app in its own tab.");
        setStatus("idle");
        return;
      }
      window.location.href = res.data.url;
    } catch (err) {
      setError(err.response?.data?.error || "Could not start bank setup. Please try again.");
      setStatus("failed");
    }
  };

  const busy = status === "starting" || status === "checking";

  return (
    <Dialog open={open} onOpenChange={busy ? undefined : onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md">
        {step === "verify" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" /> Verify your identity
              </DialogTitle>
              <DialogDescription className="sr-only">
                Identity verification required before approving your teen's first booking.
              </DialogDescription>
            </DialogHeader>

            {busy ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  {status === "starting" ? "Opening Stripe's secure verification…" : "Checking your verification result…"}
                </p>
              </div>
            ) : status === "processing" ? (
              <div className="space-y-4">
                <div className="flex items-start gap-2 bg-secondary rounded-xl p-3 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 shrink-0 mt-0.5 animate-spin" />
                  <span>Stripe is still verifying your details — this usually takes a minute or two. You can check again below.</span>
                </div>
                <Button variant="outline" className="w-full rounded-xl" onClick={checkIdentityStatus}>
                  Check status again
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-foreground flex items-center justify-center">
                  <IdCard className="w-7 h-7 text-background" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm text-foreground leading-relaxed">
                    Before you approve your teen's first job, we need to verify you're their parent or guardian — this keeps everyone safe.
                  </p>
                  <p className="text-sm text-muted-foreground">It takes about a minute.</p>
                </div>

                {(status === "failed" || error) && (
                  <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p>{error}</p>
                      <p className="text-xs">Your booking is safely waiting — it won't be approved or denied until you're verified.</p>
                    </div>
                  </div>
                )}

                <div className="bg-secondary rounded-xl p-3 text-xs text-muted-foreground flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>You'll enter your full name, date of birth, and government ID number (such as your driver's license or state ID number). We never see or store your ID details.</span>
                </div>

                <div className="grid gap-2">
                  <Button className="w-full rounded-xl" onClick={startIdentity}>
                    {status === "failed" ? "Try verification again" : "Verify with Stripe"}
                  </Button>
                  {status === "failed" && (
                    <a
                      href="mailto:aaditya.kamat10@gmail.com"
                      className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                    >
                      <LifeBuoy className="w-3.5 h-3.5" /> Contact support
                    </a>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {step === "bank" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Landmark className="w-5 h-5" /> Connect your payout account
              </DialogTitle>
              <DialogDescription className="sr-only">
                Connect your bank account to receive payouts when your teen gets paid.
              </DialogDescription>
            </DialogHeader>

            {busy ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  {status === "starting" ? "Opening Stripe's secure bank setup…" : "Confirming your bank connection…"}
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-foreground flex items-center justify-center">
                  <Landmark className="w-7 h-7 text-background" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm text-foreground leading-relaxed">
                    You're verified! Now connect your bank account so you can receive payouts when your teen gets paid.
                  </p>
                  <p className="text-sm text-muted-foreground">You'll enter your bank details directly with Stripe — we never see or store them.</p>
                </div>

                {error && (
                  <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <div className="grid gap-2">
                  <Button className="w-full rounded-xl" onClick={startBank}>
                    Set up payouts with Stripe
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Bank connection is required before you can approve your teen's job.
                </p>
              </div>
            )}
          </>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-foreground flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-background" />
            </div>
            <DialogTitle className="text-lg font-bold">All set!</DialogTitle>
            <p className="text-sm text-muted-foreground">Approving the booking now…</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}