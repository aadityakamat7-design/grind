import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { money, PLATFORM_FEE_RATE, notify } from "@/lib/grind";
import { ShieldCheck, Lock } from "lucide-react";

export default function BookDialog({ open, onOpenChange, listing, teen, buyerName, buyerUserId, parentUserId, onBooked }) {
  const [form, setForm] = useState({ date: "", time: "", address: "", notes: "", hours: 1 });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const total = listing ? (listing.price_model === "HOURLY" ? listing.price * (Number(form.hours) || 1) : listing.price) : 0;
  const fee = Math.round(total * PLATFORM_FEE_RATE * 100) / 100;

  const submit = async () => {
    setError("");
    if (!form.date || !form.time || !form.address) { setError("Date, time, and address are required."); return; }
    setSaving(true);
    const start = new Date(`${form.date}T${form.time}`).toISOString();

    const booking = await base44.entities.Booking.create({
      listing_id: listing.id,
      listing_title: listing.title,
      category: listing.category,
      teen_user_id: listing.teen_user_id,
      teen_display_name: teen?.display_name || listing.teen_display_name,
      buyer_user_id: buyerUserId,
      buyer_name: buyerName,
      parent_user_id: parentUserId,
      scheduled_start: start,
      address: form.address,
      notes: form.notes,
      status: "pending_parent_approval",
      price_total: total,
      platform_fee: fee,
      payment_status: "held",
    });

    await base44.entities.MessageThread.create({
      booking_id: booking.id,
      subject: listing.title,
      teen_user_id: listing.teen_user_id,
      buyer_user_id: buyerUserId,
      parent_user_id: parentUserId,
      teen_name: teen?.display_name || listing.teen_display_name,
      buyer_name: buyerName,
      is_confirmed: false,
    });

    await Promise.all([
      notify(base44, parentUserId, "Approval needed", `${buyerName} booked "${listing.title}" for ${teen?.display_name}. Payment is held in escrow until you approve.`, "/approvals"),
      notify(base44, listing.teen_user_id, "New booking request! 🎉", `${buyerName} booked "${listing.title}". Waiting on your parent's approval.`, `/bookings/${booking.id}`),
    ]);

    setSaving(false);
    onOpenChange(false);
    onBooked?.(booking);
  };

  if (!listing) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Book "{listing.title}"</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
            </div>
            <div>
              <Label>Time</Label>
              <Input type="time" value={form.time} onChange={(e) => set("time", e.target.value)} />
            </div>
          </div>
          {listing.price_model === "HOURLY" && (
            <div>
              <Label>Estimated hours</Label>
              <Input type="number" min="1" value={form.hours} onChange={(e) => set("hours", e.target.value)} />
            </div>
          )}
          <div>
            <Label>Job address</Label>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="42 Maple St" />
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Only revealed to the teen after the parent approves.
            </p>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Anything they should know?" />
          </div>

          <div className="bg-muted rounded-xl p-4 text-sm space-y-1">
            <div className="flex justify-between"><span>Service</span><span>{money(total)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Platform fee (10%)</span><span>{money(fee)}</span></div>
            <div className="flex justify-between font-bold border-t border-border pt-1 mt-1"><span>Held in escrow</span><span>{money(total)}</span></div>
          </div>

          <div className="bg-secondary rounded-xl p-3 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-secondary-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-secondary-foreground">
              Your payment is held in escrow and only released after the job is completed and confirmed. The teen's parent must approve before anything is scheduled.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full rounded-full h-11" onClick={submit} disabled={saving}>
            {saving ? "Booking…" : `Pay ${money(total)} into escrow & request`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}