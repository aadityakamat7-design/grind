import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import AdminActionDialog from "./AdminActionDialog";
import { adminInvoke, RESEND_REASONS } from "@/lib/adminApi";

// Re-sends a booking's email and in-app notice. Recipients come from the
// booking itself, never from this screen.
export default function AdminResendDialog({ booking, open, onOpenChange, onDone }) {
  const [kind, setKind] = useState("confirmation");

  return (
    <AdminActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Re-send booking notifications"
      description={`"${booking.listing_title}"`}
      reasons={RESEND_REASONS}
      confirmLabel="Re-send now"
      summary={
        <>
          <Line label="Job" value={booking.listing_title} />
          <Line label="Sending" value={KIND_LABEL[kind]} />
          <Line label="To" value="Neighbor, teen and parent (email + in-app)" />
        </>
      }
      onConfirm={async (r) => {
        const data = await adminInvoke("adminResendBookingNotifications", {
          bookingId: booking.id,
          kind,
          ...r,
        });
        onDone(data);
      }}
    >
      <div className="space-y-2">
        <Label>What should be re-sent?</Label>
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="confirmation">Booking confirmation</SelectItem>
            <SelectItem value="approval_request">Parent approval request</SelectItem>
            <SelectItem value="receipt">Receipt</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </AdminActionDialog>
  );
}

const KIND_LABEL = {
  confirmation: "Booking confirmation",
  approval_request: "Parent approval request",
  receipt: "Receipt",
};

function Line({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold text-foreground text-right">{value}</span>
    </div>
  );
}