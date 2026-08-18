import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { ShieldOff, AlertTriangle } from "lucide-react";

// Lets a parent revoke authorization for a linked teen at any time.
// Immediately deactivates the teen's profile and flags existing bookings for review.
export default function RevokeConsentButton({ teenUserId, teenName, onRevoked }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const revoke = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await base44.functions.invoke("revokeConsent", {
        teenUserId,
        reason: reason.trim() || undefined,
      });
      if (res.data?.error) {
        setError(res.data.error);
        setSaving(false);
        return;
      }
      setSaving(false);
      setOpen(false);
      setReason("");
      onRevoked?.();
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong.");
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 transition-colors"
      >
        <ShieldOff className="w-3 h-3" /> Revoke authorization
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="w-4 h-4" /> Revoke authorization for {teenName}?
            </DialogTitle>
            <DialogDescription>
              This will immediately pause {teenName}'s account — they won't be able to list services or
              accept new jobs. Any existing confirmed or in-progress bookings will be flagged for review.
              You can re-link later, but you'll need to complete consent again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <textarea
              className="w-full rounded-xl border border-input bg-transparent px-3.5 py-2.5 text-sm shadow-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring resize-none"
              rows={3}
              placeholder="Reason (optional) — e.g. no longer want my teen working"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            {error && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-2.5">{error}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" className="rounded-full" disabled={saving}>Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              className="rounded-full"
              disabled={saving}
              onClick={revoke}
            >
              {saving ? "Revoking..." : "Yes, revoke authorization"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}