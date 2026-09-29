import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import AdminActionDialog from "./AdminActionDialog";
import { adminInvoke, ADDRESS_REASONS } from "@/lib/adminApi";

// Changes an in-person job's address. The new address is re-checked against the
// California rules and the teen's service radius, and for a minor the booking
// goes back to the parent — where a teen works is a safety decision.
export default function AdminAddressDialog({ booking, open, onOpenChange, onDone }) {
  const [address, setAddress] = useState(booking.address || "");
  const isMinor = !!booking.parent_user_id;

  return (
    <AdminActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Change the job address"
      description={`"${booking.listing_title}"`}
      reasons={ADDRESS_REASONS}
      confirmLabel="Change the address"
      blockConfirm={!address.trim()}
      warning={
        isMinor
          ? "This teen is under 18, so the booking goes back to their parent for approval of the new location. The payment stays held while they decide."
          : undefined
      }
      summary={
        <>
          <Line label="Job" value={booking.listing_title} />
          <Line label="From" value={booking.address || "—"} />
          <Line label="To" value={address} />
          <Line label="Approval" value={isMinor ? "Parent must approve the new location" : "No re-approval needed (18+)"} />
          <Line label="Notified" value="Neighbor, teen and parent" />
        </>
      }
      onConfirm={async (r) => {
        const data = await adminInvoke("adminSetBookingAddress", {
          bookingId: booking.id,
          address: address.trim(),
          ...r,
        });
        onDone(data);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="new-address">New job address</Label>
        <Input
          id="new-address"
          className="rounded-xl"
          placeholder="Street address, city"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <p className="text-[11px] text-muted-foreground">
          Re-checked against the California location rules and the teen's service radius.
        </p>
      </div>
    </AdminActionDialog>
  );
}

function Line({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold text-foreground text-right break-all">{value}</span>
    </div>
  );
}