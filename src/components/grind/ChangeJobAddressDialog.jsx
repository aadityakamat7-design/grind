import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Loader2 } from "lucide-react";

// "Change job address" on a booking. Editing a saved address never moves a
// booked job — this is the only way to move one, and for a teen under 18 the
// job goes back to their parent to approve the new location.
export default function ChangeJobAddressDialog({ open, onOpenChange, booking, onDone }) {
  const { toast } = useToast();
  const [address, setAddress] = useState(booking?.address || "");
  const [zip, setZip] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await base44.functions.invoke("changeJobAddress", {
        booking_id: booking.id,
        address: address.trim(),
        zip: zip.trim(),
      });
      const needsApproval = res?.data?.needs_parent_approval;
      toast({
        title: "Address changed",
        description: needsApproval
          ? "The parent has to approve the new location. If they don't, you're refunded automatically."
          : "Both the teen and their parent can see the new place.",
      });
      onOpenChange(false);
      onDone?.();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Could not change that address.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle>Change job address</DialogTitle>
          <DialogDescription>
            This job keeps the address it was booked at. Moving it doesn't change anything else about the booking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Street address</Label>
            <Input className="rounded-xl mt-1" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="1234 Main St" />
          </div>
          <div>
            <Label>ZIP code</Label>
            <Input className="rounded-xl mt-1" inputMode="numeric" maxLength={5} value={zip} onChange={(e) => setZip(e.target.value)} placeholder="94539" />
            <p className="text-[11px] text-muted-foreground mt-1 flex items-start gap-1.5">
              <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
              California only — we check the address on our side.
            </p>
          </div>
          {error && <p className="text-xs text-destructive font-medium">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button className="rounded-full" onClick={save} disabled={saving || address.trim().length < 5 || zip.length !== 5}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking…</> : "Save new address"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}