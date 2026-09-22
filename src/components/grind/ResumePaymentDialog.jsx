import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ShieldCheck, RefreshCw, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { money } from "@/lib/grind";
import ExpressCheckout from "@/components/grind/ExpressCheckout";
import PaymentConfirming from "@/components/grind/PaymentConfirming";

// Auto-opens when a buyer lands on a payment_pending booking whose escrow
// payment is still unpaid (or was declined). This is the "I clicked Pay with
// card then hit back on Stripe Checkout" recovery path — it brings the
// payment popup back so the user can complete or change their mind, without
// re-entering booking details.
//
// VERIFICATION FIRST: before showing the pay buttons, it re-fetches the
// booking and subscribes to realtime updates. If the webhook already wrote
// payment_status 'held' (the user actually paid on Stripe but hit back
// before the success redirect), it never shows the pay form — it goes
// straight to the confirming/success flow. The client never trusts a
// client-side "paid" signal; only the signature-verified webhook counts.
export default function ResumePaymentDialog({ booking, user, onResolved }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState("verifying"); // verifying | pay | confirming
  const [cardUrl, setCardUrl] = useState("");
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [error, setError] = useState("");
  const openedRef = useRef(false);

  const isBuyer = user?.id === booking?.buyer_user_id;
  const needsPayment =
    booking &&
    booking.status === "payment_pending" &&
    (booking.payment_status === "unpaid" || booking.payment_status === "payment_failed");
  const amount = booking?.charge_amount ?? booking?.price_total ?? 0;

  // Auto-open (once) when we detect the buyer has an unpaid payment_pending
  // booking. Guard with a ref so a realtime re-render doesn't re-trigger.
  useEffect(() => {
    if (!isBuyer || !needsPayment || openedRef.current) return;
    openedRef.current = true;
    setOpen(true);
    setPhase("verifying");
    setError(booking.payment_status === "payment_failed" ? "Your previous payment was declined. Please try again." : "");
    verifyAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBuyer, needsPayment, booking?.id, booking?.payment_status]);

  // Realtime: if the webhook flips payment_status to 'held' while the dialog
  // is open (user paid on Stripe, hit back, webhook arrives after landing),
  // skip straight to confirming → success. Never show pay buttons for a
  // booking that's already paid.
  useEffect(() => {
    if (!booking?.id) return;
    const unsub = base44.entities.Booking.subscribe((event) => {
      if (event.type === "update" && event.data?.id === booking.id) {
        const ps = event.data?.payment_status;
        if (ps === "held" || ps === "releasing" || ps === "released") {
          setPhase("confirming");
        }
        if (ps === "payment_failed" && phase !== "confirming") {
          setPhase("pay");
          setError("Your card was declined. Please try a different card.");
        }
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?.id]);

  // Re-fetch the booking to get the freshest payment_status before showing
  // pay buttons — the webhook may have processed between page load and dialog
  // open. Also fetch a fresh Stripe Checkout URL for the card button.
  const verifyAndLoad = async () => {
    try {
      const fresh = await base44.entities.Booking.get(booking.id);
      const ps = fresh?.payment_status;
      if (ps === "held" || ps === "releasing" || ps === "released") {
        setPhase("confirming");
        return;
      }
      setPhase("pay");
      // Pre-fetch the card checkout URL so the button is instant.
      setFetchingUrl(true);
      try {
        const res = await base44.functions.invoke("createCheckout", { bookingId: booking.id, origin: window.location.origin });
        if (res.data?.url) setCardUrl(res.data.url);
      } catch { /* non-blocking — Apple Pay may still work */ }
      setFetchingUrl(false);
    } catch {
      setPhase("pay");
      setFetchingUrl(false);
    }
  };

  const handlePaid = () => setPhase("confirming");
  const handleConfirmed = () => {
    setOpen(false);
    onResolved?.();
  };
  const handleTimeout = () => {
    setOpen(false);
    onResolved?.();
  };
  const handleFailed = () => {
    setPhase("pay");
    setError("Payment couldn't be confirmed. Please try again.");
    // Refresh the checkout URL for another card attempt.
    (async () => {
      setFetchingUrl(true);
      try {
        const res = await base44.functions.invoke("createCheckout", { bookingId: booking.id, origin: window.location.origin });
        if (res.data?.url) setCardUrl(res.data.url);
      } catch { /* ignore */ }
      setFetchingUrl(false);
    })();
  };

  const cancelBooking = async () => {
    setOpen(false);
    onResolved?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); onResolved?.(); } }}>
      <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete your payment</DialogTitle>
          <DialogDescription>
            {booking?.listing_title} · {money(amount)} held in escrow until the job is done.
          </DialogDescription>
        </DialogHeader>

        {phase === "verifying" && (
          <div className="flex flex-col items-center text-center gap-3 py-8">
            <RefreshCw className="w-7 h-7 text-primary animate-spin" />
            <p className="text-sm font-semibold text-foreground">Verifying payment status…</p>
            <p className="text-xs text-muted-foreground max-w-xs">Checking if your payment went through before you went back.</p>
          </div>
        )}

        {phase === "pay" && (
          <div className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}
            <div className="bg-secondary rounded-xl p-3.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount due</span>
                <span className="font-bold text-foreground">{money(amount)}</span>
              </div>
            </div>
            <ExpressCheckout
              bookingId={booking?.id}
              amount={amount}
              payLabel={`Pay ${money(amount)} to book`}
              cardUrl={cardUrl}
              bookingEscrow
              disabled={fetchingUrl}
              onSuccess={handlePaid}
              onError={(msg) => setError(msg)}
            />
            <div className="flex items-start gap-2 bg-emerald-50 rounded-xl p-3 text-xs text-emerald-700">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
              Payment is held in escrow. Full refund if the parent declines.
            </div>
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={cancelBooking}>
              <X className="w-4 h-4 mr-1.5" /> Cancel this booking
            </Button>
          </div>
        )}

        {phase === "confirming" && (
          <PaymentConfirming
            bookingId={booking?.id}
            onConfirmed={handleConfirmed}
            onTimeout={handleTimeout}
            onFailed={handleFailed}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}