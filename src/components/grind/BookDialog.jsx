import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Lock } from "lucide-react";
import { computeFees, money } from "@/lib/grind";
import { notify } from "@/lib/notify";

export default function BookDialog({ open, onOpenChange, listing, buyer, buyerProfile }) {
  const navigate = useNavigate();
  const [when, setWhen] = useState("");
  const [hours, setHours] = useState(1);
  const [address, setAddress] = useState(buyerProfile?.address || "");
  const [notes, setNotes] = useState("");
  const [recurrence, setRecurrence] = useState("none");
  const [saving, setSaving] = useState(false);

  const total = listing.price_model === "HOURLY" ? Number(listing.price) * Number(hours || 1) : Number(listing.price);
  const { platform_fee, net_amount } = computeFees(total);
  const creditApplied = Math.min(Number(buyerProfile?.referral_credit || 0), total);
  const buyerPays = Math.round((total - creditApplied) * 100) / 100;

  const book = async () => {
    setSaving(true);
    const links = await base44.entities.ParentTeenLink.filter({ teen_user_id: listing.teen_user_id, status: "confirmed" });
    const parentUserId = links[0]?.parent_user_id || "";
    const booking = await base44.entities.Booking.create({
      listing_id: listing.id,
      listing_title: listing.title,
      teen_user_id: listing.teen_user_id,
      teen_display_name: listing.teen_display_name,
      parent_user_id: parentUserId,
      buyer_user_id: buyer.id,
      buyer_name: buyer.full_name?.split(" ")[0] || "Neighbor",
      scheduled_start: when ? new Date(when).toISOString() : null,
      address,
      notes,
      is_recurring: recurrence !== "none",
      recurrence: recurrence !== "none" ? recurrence : undefined,
      status: "pending_parent_approval",
      price_total: total,
      platform_fee,
      net_amount,
      payment_status: "held",
    });
    if (creditApplied > 0) {
      await base44.entities.BuyerProfile.update(buyerProfile.id, {
        referral_credit: Math.round(((buyerProfile.referral_credit || 0) - creditApplied) * 100) / 100,
      });
    }
    await base44.entities.MessageThread.create({
      booking_id: booking.id,
      listing_title: listing.title,
      buyer_user_id: buyer.id,
      buyer_name: buyer.full_name?.split(" ")[0] || "Neighbor",
      teen_user_id: listing.teen_user_id,
      teen_display_name: listing.teen_display_name,
      parent_user_id: parentUserId,
      participant_ids: [buyer.id, listing.teen_user_id, parentUserId].filter(Boolean),
      is_confirmed: false,
    });
    await notify(parentUserId, { type: "approval", title: "Booking needs your approval", body: `${buyer.full_name?.split(" ")[0] || "A neighbor"} booked "${listing.title}" with ${listing.teen_display_name}.`, link: `/bookings/${booking.id}` });
    await notify(listing.teen_user_id, { type: "booking", title: "New booking request", body: `"${listing.title}" — waiting on parent approval.`, link: `/bookings/${booking.id}` });
    setSaving(false);
    onOpenChange(false);
    navigate(`/bookings/${booking.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book {listing.teen_display_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Date & time</Label>
            <Input type="datetime-local" className="rounded-xl mt-1" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          <div>
            <Label>How often?</Label>
            <Select value={recurrence} onValueChange={setRecurrence}>
              <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">One-time job</SelectItem>
                <SelectItem value="weekly">Weekly (recurring)</SelectItem>
                <SelectItem value="biweekly">Every 2 weeks (recurring)</SelectItem>
                <SelectItem value="monthly">Monthly (recurring)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {listing.price_model === "HOURLY" && (
            <div>
              <Label>Hours</Label>
              <Input type="number" min="1" className="rounded-xl mt-1" value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
          )}
          <div>
            <Label>Job address</Label>
            <Input className="rounded-xl mt-1" placeholder="Where will the job happen?" value={address} onChange={(e) => setAddress(e.target.value)} />
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Only shared after the parent approves.
            </p>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea className="rounded-xl mt-1" placeholder="Anything the teen should know?" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1.5">
            <div className="flex justify-between"><span className="text-slate-500">Total (held in escrow)</span><span className="font-bold">{money(total)}</span></div>
            {creditApplied > 0 && (
              <div className="flex justify-between text-xs text-emerald-600 font-semibold"><span>Referral credit</span><span>−{money(creditApplied)}</span></div>
            )}
            {creditApplied > 0 && (
              <div className="flex justify-between text-xs font-bold text-slate-900"><span>You pay</span><span>{money(buyerPays)}</span></div>
            )}
            <div className="flex justify-between text-xs text-slate-400"><span>Platform fee</span><span>{money(platform_fee)}</span></div>
            <div className="flex justify-between text-xs text-slate-400"><span>Teen earns</span><span>{money(net_amount)}</span></div>
          </div>
          <div className="flex items-start gap-2 bg-emerald-50 rounded-xl p-3 text-xs text-emerald-700">
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
            Your payment is held until the job is done. The teen's parent must approve this booking before it's confirmed.
          </div>
          <Button className="w-full rounded-xl" disabled={!when || !address || saving} onClick={book}>
            {saving ? "Booking..." : `Pay ${money(buyerPays)} & request booking`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}