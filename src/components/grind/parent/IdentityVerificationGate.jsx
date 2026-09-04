import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Landmark, CheckCircle2 } from "lucide-react";

// Bank-setup dialog shown when a parent needs to connect their payout account.
//   Step "bank": Stripe Connect Express bank linking
//   Step "done": Brief confirmation
export default function IdentityVerificationGate({ open, onOpenChange, onVerified }) {
  const [step, setStep] = useState("bank");
  const [status, setStatus] = useState("idle"); // idle | starting | checking | failed
  const [error, setError] = useState("");

  // Reset to the initial step whenever the gate opens
  useEffect(() => {
    if (open) {
      setStep("bank");
      setStatus("idle");
      setError("");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkConnectStatus = useCallback(async () => {
    setStatus("checking");
    setError("");
    try {
      const res = await base44.functions.invoke("checkConnectStatus", {});
      const s = res.data?.status;
      if (s === "active") {
        setStep("done");
        setStatus("idle");
        setTimeout(() => { onVerified?.(); }, 1200);
      } else if (s === "not_setup") {
        setError("It looks like the bank setup wasn't completed. Please connect your bank account to continue.");
        setStatus("failed");
      } else if (s === "restricted") {
        setError("Your payout account still needs a few more details. Please finish the bank setup to continue.");
        setStatus("failed");
      } else {
        setError("Stripe is still confirming your bank details — this usually takes a few minutes. Try again in a moment.");
        setStatus("failed");
      }
    } catch (err) {
      setError(err.response?.data?.error || "We couldn't confirm your bank connection.");
      setStatus("failed");
    }
  }, [onVerified]);

  // Handle redirect returns from Stripe
  useEffect(() => {
    if (!open) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("connect")) {
      window.history.replaceState({}, "", window.location.pathname);
      checkConnectStatus();
    }
  }, [open, checkConnectStatus]);

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
                    Connect your bank account so you can receive payouts when your teen gets paid.
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
                  Bank connection is required before your teen can withdraw their earnings.
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
            <p className="text-sm text-muted-foreground">Your payout account is ready.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}