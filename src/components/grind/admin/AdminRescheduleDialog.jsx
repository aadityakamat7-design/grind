import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import AdminActionDialog from "./AdminActionDialog";
import { adminInvoke, RESCHEDULE_REASONS } from "@/lib/adminApi";

// Moves a booking to a new time. The server re-runs the age and work-hour rules
// for the new slot, and for a minor the booking returns to the parent for
// approval with the payment still held.
export default function AdminRescheduleDialog({ booking, open, onOpenChange, onDone }) {
  const initial = booking.scheduled_start
    ? new Date(new Date(booking.scheduled_start).getTime() - new Date().getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16)
    : "";
  const [when, setWhen] = useState(initial);
  const isMinor = !!booking.parent_user_id;

  const format = (v) => (v ? new Date(v).toLocaleString() : "—");

  return (
    <AdminActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Reschedule this booking"
      description={`"${booking.listing_title}"`}
      reasons={RESCHEDULE_REASONS}
      confirmLabel="Move the booking"
      blockConfirm={!when}
      warning={
        isMinor
          ? "This teen is under 18, so the booking goes back to their parent for approval. The payment stays held while they decide, and a decline refunds the neighbor automatically."
          : undefined
      }
      summary={
        <>
          <Line label="Job" value={booking.listing_title} />
          <Line label="From" value={format(booking.scheduled_start)} />
          <Line label="To" value={format(when)} />
          <Line label="Approval" value={isMinor ? "Parent must approve the new time" : "No re-approval needed (18+)"} />
          <Line label="Payment" value={booking.payment_status} />
          <Line label="Notified" value="Neighbor, teen and parent" />
        </>
      }
      onConfirm={async (r) => {
        const data = await adminInvoke("adminRescheduleBooking", {
          bookingId: booking.id,
          scheduledStart: new Date(when).toISOString(),
          ...r,
        });
        onDone(data);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="new-time">New date and time</Label>
        <Input
          id="new-time"
          className="rounded-xl"
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
        />
        <p className="text-[11px] text-muted-foreground">
          Hour and age limits are checked again for this new time.
        </p>
      </div>
    </AdminActionDialog>
  );
}

function Line({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold text-foreground text-right">{value}</span>
    </div>
  );
}