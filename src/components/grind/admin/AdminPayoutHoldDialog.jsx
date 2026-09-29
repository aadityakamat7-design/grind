import React from "react";
import AdminActionDialog from "./AdminActionDialog";
import { adminInvoke, HOLD_REASONS } from "@/lib/adminApi";

// Freezes or unfreezes a booking's payout. While held, the payout pass skips
// the booking entirely, so the transfer genuinely cannot go out.
export default function AdminPayoutHoldDialog({ booking, open, onOpenChange, onDone }) {
  const held = booking.payout_hold === true;

  return (
    <AdminActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={held ? "Release this payout hold" : "Hold this payout"}
      description={`"${booking.listing_title}"`}
      reasons={HOLD_REASONS}
      confirmLabel={held ? "Release the hold" : "Hold the payout"}
      destructive={!held}
      warning={
        held
          ? undefined
          : "The normal payout flow resumes as soon as the hold is released. The parent and teen see this as \"under review\"."
      }
      summary={
        <>
          <Line label="Job" value={booking.listing_title} />
          <Line label="Payout status" value={String(booking.payout_status || "—").replace(/_/g, " ")} />
          <Line label="Amount" value={`$${Number(booking.net_amount || 0).toFixed(2)}`} />
          <Line label="Change" value={held ? "Resume the normal payout flow" : "Pause the payout until released"} />
          {held && booking.payout_hold_reason && <Line label="Hold reason" value={booking.payout_hold_reason} />}
          <Line label="Notified" value="Parent and teen" />
        </>
      }
      onConfirm={async (r) => {
        const data = await adminInvoke("adminSetPayoutHold", {
          bookingId: booking.id,
          hold: !held,
          ...r,
        });
        onDone(data);
      }}
    >
      <p className="text-xs text-muted-foreground leading-relaxed">
        {held
          ? "Releasing the hold puts this booking back into the normal payout flow."
          : "Holding pauses the payout while you investigate. No money moves until you release it."}
      </p>
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