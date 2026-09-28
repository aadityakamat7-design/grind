import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ShieldCheck, FileText } from "lucide-react";
import { Link } from "react-router-dom";

// Terms acceptance gate — shown to authenticated users who haven't accepted
// the current Terms of Service version. Blocks all app actions until accepted.
// Teens under 18 see a "ask your parent" message instead of the checkbox.
//
// Wired into Layout.jsx — checks on mount via the checkTermsAcceptance
// backend function and shows the modal if needsAcceptance is true.

export default function TermsAcceptanceGate() {
  const [state, setState] = useState("loading"); // loading | needsAcceptance | accepted | teenBlocked
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke("checkTermsAcceptance", {});
        if (cancelled) return;
        const d = res.data;
        if (!d.needsAcceptance) {
          setState("accepted");
        } else if (d.isTeen && !d.canAccept) {
          setState("teenBlocked");
        } else {
          setState("needsAcceptance");
        }
      } catch (e) {
        // If the check fails, don't block the user — let them through.
        // Server-side gating in createBooking/acceptJobPost/decideBooking
        // will catch it on the actual action.
        setState("accepted");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleAccept = async () => {
    if (!checked) return;
    setSubmitting(true);
    setError("");
    try {
      await base44.functions.invoke("acceptTerms", {
        accepted: true,
        userAgent: navigator.userAgent,
      });
      setState("accepted");
    } catch (e) {
      const msg = e?.response?.data?.error || e?.data?.error || "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (state === "loading" || state === "accepted") return null;

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="max-w-md" closeable={false}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <DialogTitle className="text-base">
              {state === "teenBlocked"
                ? "Your parent needs to update consent"
                : "Updated Terms of Service"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-left">
            {state === "teenBlocked" ? (
              "Blockwork has updated its Terms of Service (version 2026-10-01). " +
              "Because you're under 18, your parent or guardian needs to accept the updated Terms for you. " +
              "Please ask them to sign in to Blockwork and accept. You won't be able to book, accept, or approve jobs until they do."
            ) : (
              "Blockwork has updated its Terms of Service (version 2026-10-01, effective October 1, 2026). " +
              "Please review and accept the updated Terms to continue using Blockwork."
            )}
          </DialogDescription>
        </DialogHeader>

        {state === "teenBlocked" ? (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              You can still browse and view pages, but booking, accepting, and approving are paused until your parent accepts.
            </p>
            <Link to="/terms" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
              <FileText className="w-3.5 h-3.5" /> Read the Terms
            </Link>
            <Button variant="outline" className="w-full" onClick={() => setState("accepted")}>
              I understand
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <Link to="/terms" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
              <FileText className="w-3.5 h-3.5" /> Read the full Terms of Service
            </Link>

            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={checked}
                onCheckedChange={(v) => setChecked(v === true)}
                className="mt-0.5"
              />
              <span className="text-sm text-foreground leading-relaxed">
                I have read and agree to the{" "}
                <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
              </span>
            </label>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              className="w-full"
              disabled={!checked || submitting}
              onClick={handleAccept}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Accepting…</>
              ) : (
                "I agree"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}