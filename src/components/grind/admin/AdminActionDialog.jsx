import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, ShieldCheck } from "lucide-react";

// Shared shell for every admin action, so the rules are impossible to skip:
//   • a short reason is required before anything runs
//   • the admin sees a summary of who is affected and what changes, and confirms
// Children render the action's own inputs (amount, price, date, message…).
export default function AdminActionDialog({
  open,
  onOpenChange,
  title,
  description,
  reasons,
  summaryLabel = "Review before confirming",
  summary,
  warning,
  children,
  confirmLabel = "Confirm action",
  destructive = false,
  blockConfirm = false,
  onConfirm,
}) {
  const [step, setStep] = useState("form");
  const [reasonCode, setReasonCode] = useState("");
  const [reasonNote, setReasonNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Reset whenever the dialog is (re)opened so a previous action never leaves
  // its reason or its confirm step behind.
  useEffect(() => {
    if (open) {
      setStep("form");
      setReasonCode("");
      setReasonNote("");
      setBusy(false);
      setError("");
    }
  }, [open]);

  const canReview = reasonCode && !blockConfirm;

  const run = async () => {
    setBusy(true);
    setError("");
    try {
      await onConfirm({ reason_code: reasonCode, reason_note: reasonNote });
      onOpenChange(false);
    } catch (err) {
      setError(err?.message || "That action could not be completed.");
      setStep("form");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="rounded-2xl max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-4">
            {children}

            <div className="space-y-2">
              <Label htmlFor="admin-reason">Reason (required)</Label>
              <Select value={reasonCode} onValueChange={setReasonCode}>
                <SelectTrigger id="admin-reason" className="rounded-xl">
                  <SelectValue placeholder="Choose a reason…" />
                </SelectTrigger>
                <SelectContent>
                  {reasons.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-note">Note (optional)</Label>
              <Textarea
                id="admin-note"
                className="rounded-xl"
                rows={2}
                placeholder="Anything the next admin should know…"
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
              />
            </div>

            {warning && (
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">{warning}</p>
              </div>
            )}

            {error && <p className="text-xs text-destructive">{error}</p>}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button disabled={!canReview} onClick={() => setStep("confirm")}>
                Review
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {summaryLabel}
            </p>
            <div className="bg-secondary rounded-2xl p-4 space-y-2">{summary}</div>

            <div className="flex items-start gap-2.5 bg-muted rounded-xl p-3">
              <ShieldCheck className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                This is recorded in the admin audit log with your name, the reason, and the
                values before and after. Everyone affected is notified that Blockwork support
                made the change.
              </p>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <DialogFooter className="gap-2">
              <Button variant="outline" disabled={busy} onClick={() => setStep("form")}>Back</Button>
              <Button
                variant={destructive ? "destructive" : "default"}
                disabled={busy}
                onClick={run}
              >
                {busy ? "Working…" : confirmLabel}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}