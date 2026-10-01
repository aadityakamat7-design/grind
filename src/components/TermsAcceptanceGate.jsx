import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ShieldCheck, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useTermsGate } from "@/lib/TermsGateContext";

// "Updated Terms of Service" pop-up — only for a user the server says needs it:
// they accepted an older version, and they're a parent, a neighbor, or an 18+
// user. A brand-new user never sees it (they accept the current Terms during
// sign-up), and a teen under 18 never sees it either — their parent accepts on
// their behalf and the teen gets a small notice instead.
//
// The pop-up is the only overlay that blocks: the welcome tour waits for the
// status to clear (see TermsGateContext + useTour).
export default function TermsAcceptanceGate() {
  const { status, accept } = useTermsGate();
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleAccept = async () => {
    if (!checked) return;
    setSubmitting(true);
    setError("");
    try {
      await accept();
    } catch (e) {
      const msg = e?.response?.data?.error || e?.data?.error || "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (status !== "needs") return null;

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="max-w-md" closeable={false}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <DialogTitle className="text-base">Updated Terms of Service</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            Blockwork has updated its Terms of Service (version 2026-10-01, effective October 1, 2026). Please
            review and accept the updated Terms to continue using Blockwork.
          </DialogDescription>
        </DialogHeader>

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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button className="w-full" disabled={!checked || submitting} onClick={handleAccept}>
            {submitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Accepting…</>
            ) : (
              "I agree"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}