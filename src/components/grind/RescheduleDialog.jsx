import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { notify } from "@/lib/notify";

export default function RescheduleDialog({ open, onOpenChange, booking, actorIsBuyer, onDone }) {
  const [when, setWhen] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const newStart = new Date(when).toISOString();
    await base44.entities.Booking.update(booking.id, { scheduled_start: newStart });
    const otherId = actorIsBuyer ? booking.teen_user_id : booking.buyer_user_id;
    await notify(otherId, {
      type: "booking",
      title: "Booking rescheduled",
      body: `"${booking.listing_title}" was moved to ${format(new Date(newStart), "EEE, MMM d 'at' h:mm a")}.`,
      link: `/bookings/${booking.id}`,
    });
    setSaving(false);
    onOpenChange(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle>Reschedule booking</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {booking.scheduled_start && (
            <p className="text-xs text-slate-500">
              Currently: {format(new Date(booking.scheduled_start), "EEE, MMM d 'at' h:mm a")}
            </p>
          )}
          <div>
            <Label>New date & time</Label>
            <Input type="datetime-local" className="rounded-xl mt-1" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          <Button className="w-full rounded-xl" disabled={!when || saving} onClick={save}>
            {saving ? "Saving..." : "Confirm new time"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}