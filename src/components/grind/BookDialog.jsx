import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Lock, MessageCircle, Video, Sun } from "lucide-react";
import { computeFees, money, isOnlineCategory } from "@/lib/grind";
import SafetyAdvisorChat from "@/components/grind/SafetyAdvisorChat";
import SlideToConfirm from "@/components/grind/SlideToConfirm";
import DateTimePicker from "@/components/grind/DateTimePicker";

export default function BookDialog({ open, onOpenChange, listing, buyer, buyerProfile }) {
  const navigate = useNavigate();
  const [when, setWhen] = useState("");
  const [hours, setHours] = useState(1);
  const [address, setAddress] = useState(buyerProfile?.address || "");
  const [notes, setNotes] = useState("");
  const [recurrence, setRecurrence] = useState("none");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [safetyOpen, setSafetyOpen] = useState(false);

  const total = listing.price_model === "HOURLY" ? Number(listing.price) * Number(hours || 1) : Number(listing.price);
  const { platform_fee, net_amount } = computeFees(total);
  const isOnline = isOnlineCategory(listing.category) || listing.delivery_mode === "online";

  const book = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await base44.functions.invoke("createBooking", {
        listingId: listing.id,
        scheduledStart: when ? new Date(when).toISOString() : null,
        address: isOnline ? "" : address,
        notes,
        recurrence,
        hours,
      });
      const { bookingId } = res.data;
      onOpenChange(false);
      navigate(`/bookings/${bookingId}`);
    } catch (err) {
      const msg = err.response?.data?.error || "Couldn't create this booking. Please try again.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book {listing.teen_display_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className={`flex items-center gap-2 rounded-xl p-3 text-xs font-medium ${isOnline ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
            {isOnline ? (
              <><Video className="w-4 h-4" /> Online session — conducted via video, no in-person meeting</>
            ) : (
              <><Sun className="w-4 h-4" /> Outdoor work — at your residence exterior, no home entry</>
            )}
          </div>
          <div>
            <Label>Date & time</Label>
            <div className="mt-1">
              <DateTimePicker value={when} onChange={setWhen} />
            </div>
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
          {!isOnline && (
            <div>
              <Label>Job address</Label>
              <Input className="rounded-xl mt-1" placeholder="Where will the job happen?" value={address} onChange={(e) => setAddress(e.target.value)} />
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Only shared after the parent approves.
              </p>
            </div>
          )}
          <div>
            <Label>Notes (optional)</Label>
            <Textarea className="rounded-xl mt-1" placeholder="Anything the teen should know?" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1.5">
            <div className="flex justify-between"><span className="text-slate-500">Total (held in escrow)</span><span className="font-bold">{money(total)}</span></div>
            <div className="flex justify-between text-xs text-slate-400"><span>Platform fee (15%)</span><span>{money(platform_fee)}</span></div>
            <div className="flex justify-between text-xs text-slate-400"><span>Teen earns (85%)</span><span>{money(net_amount)}</span></div>
          </div>
          <div className="flex items-start gap-2 bg-emerald-50 rounded-xl p-3 text-xs text-emerald-700">
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
            No payment yet — you'll pay when both you and the teen tap "Start job." The teen's parent must approve this booking first.
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setSafetyOpen(true)}
          >
            <MessageCircle className="w-4 h-4 mr-2" /> Talk to Safety Advisor
          </Button>
          {error && <p className="text-xs text-rose-600 font-semibold text-center">{error}</p>}
          <SlideToConfirm
            label="Slide to book"
            loadingLabel="Booking..."
            loading={saving}
            disabled={!when || (!isOnline && !address)}
            onConfirm={book}
          />
        </div>
      </DialogContent>

      <Dialog open={safetyOpen} onOpenChange={setSafetyOpen}>
        <DialogContent className="rounded-2xl max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" /> Safety Advisor
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <SafetyAdvisorChat listing={listing} onClose={() => setSafetyOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}