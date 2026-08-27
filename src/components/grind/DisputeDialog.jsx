import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// Buyer reports the teen did not do the job. Holds escrow pending admin review.
export default function DisputeDialog({ open, onOpenChange, booking, onDone }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      await base44.functions.invoke("jobHandshake", {
        bookingId: booking.id,
        action: "dispute",
        disputeReason: reason,
      });
      onOpenChange(false);
      setReason("");
      onDone?.();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't submit your report.");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle>Report the work wasn't done</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tell us what was wrong with the work. The payment will be held and our team will review the photos and your report before any money is released.
          </p>
          <div>
            <Label>What was wrong?</Label>
            <Textarea
              className="rounded-xl mt-1.5"
              rows={4}
              maxLength={500}
              placeholder="e.g. The lawn wasn't mowed, only the front was done..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-destructive font-medium">{error}</p>}
          <Button variant="destructive" className="w-full rounded-xl" disabled={saving || !reason.trim()} onClick={submit}>
            {saving ? "Submitting..." : "Submit report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}