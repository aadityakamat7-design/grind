import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Lock, MessageCircle, Video, Sun, MapPin, Pencil, CheckCircle2 } from "lucide-react";
import { computeFees, money, isOnlineCategory, HOURS_OPTIONS } from "@/lib/grind";
import SafetyAdvisorChat from "@/components/grind/SafetyAdvisorChat";
import SlideToConfirm from "@/components/grind/SlideToConfirm";
import DateTimePicker from "@/components/grind/DateTimePicker";
import ExpressCheckout from "@/components/grind/ExpressCheckout";
import PaymentConfirming from "@/components/grind/PaymentConfirming";

export default function BookDialog({ open, onOpenChange, listing, buyer, buyerProfile }) {
  const navigate = useNavigate();
  const [when, setWhen] = useState("");
  const [hours, setHours] = useState(listing?.estimated_hours || 2);
  const [address, setAddress] = useState(buyerProfile?.address || "");
  const [overrideAddress, setOverrideAddress] = useState(false);
  const [notes, setNotes] = useState("");
  const [recurrence, setRecurrence] = useState("none");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [phase, setPhase] = useState("form"); // form | pay | done
  const [payBooking, setPayBooking] = useState(null); // { id, amount, cardUrl }

  // Reset to the form phase every time the dialog opens, and re-fill the
  // address from the buyer's saved profile so it's always current.
  useEffect(() => {
    if (open) {
      setPhase("form"); setPayBooking(null); setError("");
      setHours(listing?.estimated_hours || 2);
      setAddress(buyerProfile?.address || "");
      setOverrideAddress(false);
    }
  }, [open]);

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
        endDate: recurrence !== "none" ? endDate || undefined : undefined,
        origin: window.location.origin,
      });
      const { bookingId, url, paid } = res.data;
      // Free or sub-$0.50 job — no payment needed, go straight to done.
      if (paid || !url) {
        setPhase("done");
        setPayBooking({ id: bookingId });
        return;
      }
      setPayBooking({ id: bookingId, amount: total, cardUrl: url });
      setPhase("pay");
    } catch (err) {
      const msg = err.response?.data?.error || "Couldn't create this booking. Please try again.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Apple Pay / Google Pay resolved client-side — but that is NOT confirmation.
  // Wait for the verified Stripe webhook to write payment_status 'held' before
  // showing the success screen. This is the gate that prevents the booking from
  // being "treated as active before payment is actually confirmed".
  const handlePaid = () => {
    setPhase("confirming");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book {listing.teen_display_name}</DialogTitle>
        </DialogHeader>
        {phase === "form" && (
        <div className="space-y-4">
          <div className={`flex items-center gap-2 rounded-xl p-3 text-xs font-medium ${isOnline ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
            {isOnline ? (
              <><Video className="w-4 h-4" /> Online video session</>
            ) : (
              <><Sun className="w-4 h-4" /> Outdoor — at your home, no entry</>
            )}
          </div>
          <div>
            <Label>Date & time</Label>
            <div className="mt-1">
              <DateTimePicker
                value={when}
                onChange={setWhen}
                availability={listing.availability}
                hourLimits={listing.teen_hour_limits}
              />
            </div>
          </div>
          <div>
            <Label>Repeat</Label>
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
          {recurrence !== "none" && (
            <div>
              <Label>End date (optional)</Label>
              <Input
                type="date"
                className="rounded-xl mt-1"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">We'll stop scheduling after this date.</p>
            </div>
          )}
          {listing.price_model === "HOURLY" && (
            <div>
              <Label>Hours</Label>
              <Select value={String(hours)} onValueChange={(v) => setHours(Number(v))}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HOURS_OPTIONS.map((h) => (
                    <SelectItem key={h} value={String(h)}>{h} hour{h > 1 ? "s" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-primary font-semibold mt-1.5">
                {money(Number(listing.price))}/hr × {hours} hrs = {money(Number(listing.price) * Number(hours))}
              </p>
            </div>
          )}
          {!isOnline && (
            <div>
              <Label>Job address</Label>
              {overrideAddress ? (
                <Input className="rounded-xl mt-1" placeholder="Where will the job happen?" value={address} onChange={(e) => setAddress(e.target.value)} />
              ) : (
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3.5 py-2.5">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground truncate flex-1">{address || "No address on file"}</span>
                  <button
                    type="button"
                    onClick={() => setOverrideAddress(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                  >
                    <Pencil className="w-3 h-3" /> Change
                  </button>
                </div>
              )}
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Shared only after parent approval.
              </p>
            </div>
          )}
          <div>
            <Label>Notes (optional)</Label>
            <Textarea className="rounded-xl mt-1" placeholder="Anything the teen should know?" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1.5">
            <div className="flex justify-between"><span className="text-slate-500">Total</span><span className="font-bold">{money(total)}</span></div>
            <div className="flex justify-between text-xs text-slate-400"><span>Teen earns</span><span>{money(net_amount)}</span></div>
          </div>
          <div className="flex items-start gap-2 bg-emerald-50 rounded-xl p-3 text-xs text-emerald-700">
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
            Once you pay, your payment is held in escrow until the job is done. Full refund if the parent declines.
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
        )}
        {phase === "pay" && payBooking && (
          <div className="space-y-4">
            <ExpressCheckout
              bookingId={payBooking.id}
              amount={payBooking.amount}
              payLabel={`Pay ${money(payBooking.amount)} to book`}
              cardUrl={payBooking.cardUrl}
              bookingEscrow
              onSuccess={handlePaid}
            />
          </div>
        )}
        {phase === "confirming" && payBooking && (
          <PaymentConfirming
            bookingId={payBooking.id}
            onConfirmed={() => setPhase("done")}
            onTimeout={() => setPhase("done")}
            onFailed={() => { setError("Payment couldn't be confirmed. Please try again."); setPhase("pay"); }}
          />
        )}
        {phase === "done" && (
          <div className="space-y-5 py-2">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-xl font-bold text-foreground">Booking requested!</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                {listing.teen_display_name} has been notified. We're waiting for their parent to approve before the job is confirmed.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-slate-50 p-4 space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold text-base">
                    {(listing.teen_display_name || "?").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{listing.teen_display_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{listing.title}</p>
                </div>
              </div>
              <div className="h-px bg-border" />
              <div className="space-y-2">
                {when && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Sun className="w-4 h-4 shrink-0" />
                    <span>{new Date(when).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} at {new Date(when).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold text-foreground">{money(total)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-amber-50 rounded-xl p-3 text-xs text-amber-700">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Your payment is held safely in escrow. If the parent declines, you get a full refund automatically.</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Waiting for parent approval</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground opacity-50">
                <span className="w-2 h-2 rounded-full bg-slate-300" />
                <span>Parent approves → job confirmed</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground opacity-50">
                <span className="w-2 h-2 rounded-full bg-slate-300" />
                <span>Teen starts the job on the scheduled day</span>
              </div>
            </div>

            <Button className="w-full" onClick={() => { onOpenChange(false); navigate(`/bookings/${payBooking.id}`); }}>
              View booking details
            </Button>
          </div>
        )}
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