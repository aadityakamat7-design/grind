import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import AdminActionDialog from "./AdminActionDialog";
import { adminInvoke, CANCEL_REASONS } from "@/lib/adminApi";
import { money } from "@/lib/grind";

// Cancels a booking, offering only the money outcomes the booking's real
// payment state actually supports. A payment that already left for the teen
// can't be refunded automatically, so that case is called out plainly.
export default function AdminCancelDialog({ booking, open, onOpenChange, onDone }) {
  const captured = booking.payment_status === "held";
  const paidOut = ["released", "releasing"].includes(booking.payment_status);
  const [mode, setMode] = useState(paidOut ? "none" : captured ? "full" : "none");
  const [amount, setAmount] = useState("");

  const ceiling = Math.max(
    0,
    Number(booking.charge_amount ?? booking.price_total ?? 0) - Number(booking.admin_refund_amount || 0)
  );

  const options = paidOut
    ? [{ value: "none", label: "Cancel the record only — no automatic refund" }]
    : captured
      ? [
        { value: "full", label: `Refund the neighbor in full (${money(ceiling)})` },
        { value: "partial", label: "Refund part of it, release the rest to the teen" },
        { value: "none", label: "No refund — the teen still gets paid" },
      ]
      : [{ value: "none", label: "Cancel — no money was ever taken" }];

  const partialInvalid = mode === "partial" && !(Number(amount) > 0);
  const overCeiling = mode === "partial" && Number(amount) > ceiling;

  const moneyLine = mode === "full"
    ? `${money(ceiling)} goes back to ${booking.buyer_name || "the neighbor"}.`
    : mode === "partial"
      ? `${money(amount || 0)} goes back to the neighbor and the remaining ${money(Math.max(0, Number(booking.price_total || 0) - Number(amount || 0)))} is released to the teen.`
      : captured
        ? "No money is returned — the held payment is released to the teen."
        : "No money changes hands.";

  return (
    <AdminActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Cancel this booking"
      description={`"${booking.listing_title}"`}
      reasons={CANCEL_REASONS}
      destructive
      confirmLabel="Cancel booking"
      blockConfirm={partialInvalid || overCeiling}
      warning={
        paidOut
          ? "The payment on this booking was already released to the teen's side, so Stripe can't refund it automatically. This cancels the record and flags it for a manual transfer reversal."
          : undefined
      }
      summary={
        <>
          <Line label="Job" value={booking.listing_title} />
          <Line label="Neighbor" value={booking.buyer_name || booking.buyer_user_id} />
          <Line label="Teen" value={booking.teen_display_name || booking.teen_user_id} />
          <Line label="Booking was" value={String(booking.status).replace(/_/g, " ")} />
          <Line label="Money" value={moneyLine} />
          <Line label="Notified" value="Neighbor, teen and parent" />
        </>
      }
      onConfirm={async (r) => {
        const data = await adminInvoke("adminCancelBooking", {
          bookingId: booking.id,
          money: mode,
          refundAmount: mode === "partial" ? Number(amount) : undefined,
          ...r,
        });
        onDone(data);
      }}
    >
      <div className="space-y-2">
        <Label>How should the money be handled?</Label>
        <Select value={mode} onValueChange={setMode}>
          <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {mode === "partial" && (
        <div className="space-y-2">
          <Label htmlFor="refund-amount">Amount to refund the neighbor</Label>
          <Input
            id="refund-amount"
            className="rounded-xl"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            Up to {money(ceiling)} is refundable. The rest is released to the teen.
          </p>
          {overCeiling && (
            <p className="text-[11px] text-destructive flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> That's more than this booking still has refundable.
            </p>
          )}
        </div>
      )}
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