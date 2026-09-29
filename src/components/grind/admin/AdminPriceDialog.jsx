import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import AdminActionDialog from "./AdminActionDialog";
import { adminInvoke, PRICE_REASONS } from "@/lib/adminApi";
import { money } from "@/lib/grind";

// Lowers a booking's price after payment. Increases are deliberately not
// possible here — they would need a new charge the neighbor agrees to.
export default function AdminPriceDialog({ booking, open, onOpenChange, onDone }) {
  const current = Number(booking.price_total || 0);
  const [price, setPrice] = useState("");

  const next = Number(price);
  const valid = next > 0 && next < current && next >= 16.9;
  const difference = valid ? Math.round((current - next) * 100) / 100 : 0;
  const refundable = Math.max(
    0,
    Number(booking.charge_amount ?? current) - Number(booking.admin_refund_amount || 0)
  );
  const overCeiling = valid && difference > refundable;

  return (
    <AdminActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Lower this booking's price"
      description={`"${booking.listing_title}"`}
      reasons={PRICE_REASONS}
      confirmLabel="Lower the price"
      blockConfirm={!valid || overCeiling}
      warning={
        booking.payment_status === "unpaid"
          ? "No payment has been taken yet, so no refund is issued — the price simply changes."
          : undefined
      }
      summary={
        <>
          <Line label="Job" value={booking.listing_title} />
          <Line label="Price" value={`${money(current)} → ${money(next)}`} />
          <Line label="Refunded to neighbor" value={money(difference)} />
          <Line label="Teen's payout" value="Recalculated from the new price" />
          <Line label="Notified" value="Neighbor, teen and parent" />
        </>
      }
      onConfirm={async (r) => {
        const data = await adminInvoke("adminAdjustBookingPrice", {
          bookingId: booking.id,
          price: next,
          ...r,
        });
        onDone(data);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="new-price">New price</Label>
        <Input
          id="new-price"
          className="rounded-xl"
          type="number"
          min="16.9"
          step="0.01"
          placeholder={String(current)}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <p className="text-[11px] text-muted-foreground">
          Current price {money(current)} · up to {money(refundable)} can be refunded. The minimum is {money(16.9)}.
        </p>
        {price && !valid && (
          <p className="text-[11px] text-destructive">
            Enter an amount below {money(current)} and at least {money(16.9)}.
          </p>
        )}
        {overCeiling && (
          <p className="text-[11px] text-destructive">
            That reduction is more than this booking still has refundable.
          </p>
        )}
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