import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import AdminActionDialog from "./AdminActionDialog";
import { adminInvoke, RESOLVE_REASONS } from "@/lib/adminApi";
import { money } from "@/lib/grind";

// Resolves a disputed or stuck booking: release in full, split it, refund the
// neighbor, or record a no-show by either side.
export default function AdminResolveDialog({ booking, open, onOpenChange, onDone }) {
  const [choice, setChoice] = useState("release");
  const [amount, setAmount] = useState("");

  const ceiling = Math.max(
    0,
    Number(booking.charge_amount ?? booking.price_total ?? 0) - Number(booking.admin_refund_amount || 0)
  );
  const splitInvalid = choice === "split" && (!(Number(amount) > 0) || Number(amount) >= ceiling);

  const outcome = {
    release: `The full held payment is released to the teen.`,
    split: `${money(amount || 0)} is refunded to the neighbor and ${money(Math.max(0, Number(booking.price_total || 0) - Number(amount || 0)))} is released to the teen.`,
    refund: `The full ${money(ceiling)} is refunded to the neighbor.`,
    no_show_teen: `The teen is marked as a no-show and the neighbor is refunded ${money(ceiling)}.`,
    no_show_buyer: `The neighbor is marked as a no-show and the payment is released to the teen.`,
  }[choice];

  return (
    <AdminActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Resolve this booking"
      description={`"${booking.listing_title}"`}
      reasons={RESOLVE_REASONS}
      confirmLabel="Resolve booking"
      destructive={choice === "refund" || choice === "no_show_teen"}
      blockConfirm={splitInvalid}
      summary={
        <>
          <Line label="Job" value={booking.listing_title} />
          <Line label="Teen says" value={booking.teen_finished_at ? "Marked the work finished" : "Never marked finished"} />
          <Line label="Neighbor says" value={booking.buyer_disputed_at ? "Reported the work wasn't done" : "No dispute filed"} />
          {booking.dispute_reason && <Line label="Their reason" value={booking.dispute_reason} />}
          <Line label="Held payment" value={money(Number(booking.charge_amount || booking.price_total || 0))} />
          <Line label="Outcome" value={outcome} />
          <Line label="Notified" value="Neighbor, teen and parent" />
        </>
      }
      onConfirm={async (r) => {
        const data = await adminInvoke("adminResolveBooking", {
          bookingId: booking.id,
          resolution: choice,
          refundAmount: choice === "split" ? Number(amount) : undefined,
          ...r,
        });
        onDone(data);
      }}
    >
      <div className="space-y-2">
        <Label>How should this be resolved?</Label>
        <Select value={choice} onValueChange={setChoice}>
          <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="release">Release in full to the teen</SelectItem>
            <SelectItem value="split">Split — refund part, release the rest</SelectItem>
            <SelectItem value="refund">Refund the neighbor in full</SelectItem>
            <SelectItem value="no_show_teen">Mark a teen no-show (refund the neighbor)</SelectItem>
            <SelectItem value="no_show_buyer">Mark a neighbor no-show (pay the teen)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {choice === "split" && (
        <div className="space-y-2">
          <Label htmlFor="split-amount">Amount to refund the neighbor</Label>
          <Input
            id="split-amount"
            className="rounded-xl"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            Must be less than the full {money(ceiling)}. The rest is released to the teen.
          </p>
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