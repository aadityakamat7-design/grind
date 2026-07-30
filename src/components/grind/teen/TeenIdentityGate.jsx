import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, AlertCircle, Loader2, IdCard, LifeBuoy } from "lucide-react";

// Teen identity-verification gate, shown the first time a teen accepts a job.
// Launches Stripe Identity, handles the redirect return, and calls onVerified
// once the teen is confirmed.
export default function TeenIdentityGate({ open, onOpenChange, onVerified }) {
  const [status, setStatus] = useState("idle"); // idle | starting | checking | processing | failed
  const [error, setError] = useState("");

  const checkStatus = useCallback(async () => {
    setStatus("checking");
    setError("");
    try {
      const res = await base44.functions.invoke("checkTeenIdentityStatus", {});
      const s = res.data?.status;
      if (s === "verified") { onVerified?.(); return; }
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
  }, [onVerified]);

  useEffect(() => {
    if (!open) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("teen_identity_return")) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
      checkStatus();
    }
  }, [open, checkStatus]);

  const start = async () => {
    setStatus("starting");
    setError("");
    const returnUrl = `${window.location.origin}${window.location.pathname}?teen_identity_return=1`;
    try {
      const res = await base44.functions.invoke("createTeenIdentitySession", { returnUrl });
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
    } catch (err) {
      setError(err.response?.data?.error || "Could not start verification. Please try again.");
      setStatus("failed");
    }
  };

  const busy = status === "starting" || status === "checking";

  return (
    <Dialog open={open} onOpenChange={busy ? undefined : onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" /> Verify your identity
          </DialogTitle>
          <DialogDescription className="sr-only">
            Identity verification required before your first job can be approved.
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
            <Button variant="outline" className="w-full rounded-xl" onClick={checkStatus}>
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
                Before your first job can be approved, we need to verify your identity — this keeps you and the people you work for safe.
              </p>
              <p className="text-sm text-muted-foreground">It takes about a minute, and you'll only do it once.</p>
            </div>

            {(status === "failed" || error) && (
              <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p>{error}</p>
                  <p className="text-xs">Your job is safely waiting — it won't be approved until you're verified.</p>
                </div>
              </div>
            )}

            <div className="bg-secondary rounded-xl p-3 text-xs text-muted-foreground flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>You'll enter your full name, date of birth, and government ID number. We never see or store your ID details.</span>
            </div>

            <div className="grid gap-2">
              <Button className="w-full rounded-xl" onClick={start}>
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
      </DialogContent>
    </Dialog>
  );
}