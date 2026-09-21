import React, { useEffect } from "react";
import { usePaymentConfirmation } from "@/hooks/usePaymentConfirmation";
import { Loader2, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

// Renders the "confirming your payment" state inside the booking dialog and
// fires callbacks based on the verified-webhook-driven payment status. It
// never fakes success — onConfirmed only fires once the server's
// payment_status is 'held' (set by the signature-verified Stripe webhook).
//
// onConfirmed: auto-advances to the success view (no user action needed).
// onTimeout:   payment was received but the webhook is slow — let the user
//              continue; we'll email when it's confirmed.
// onFailed:    charge was declined — send the user back to retry payment.
export default function PaymentConfirming({ bookingId, onConfirmed, onTimeout, onFailed }) {
  const state = usePaymentConfirmation(bookingId);

  useEffect(() => {
    if (state === "confirmed") onConfirmed?.();
  }, [state, onConfirmed]);

  if (state === "confirmed") return null;

  if (state === "failed") {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-rose-600" />
        </div>
        <p className="text-base font-bold text-foreground">Payment couldn't be confirmed</p>
        <p className="text-sm text-muted-foreground max-w-xs">Your card may have been declined. You can try again.</p>
        {onFailed && <Button variant="outline" onClick={onFailed}>Try again</Button>}
      </div>
    );
  }

  if (state === "timeout") {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-4">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
          <Clock className="w-6 h-6 text-amber-600" />
        </div>
        <p className="text-base font-bold text-foreground">Still processing</p>
        <p className="text-sm text-muted-foreground max-w-xs">We received your payment but are still confirming it with the bank. You can continue — we'll email you once it's confirmed.</p>
        {onTimeout && <Button variant="outline" onClick={onTimeout}>Continue</Button>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center gap-3 py-6">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-base font-bold text-foreground">Confirming your payment…</p>
      <p className="text-sm text-muted-foreground max-w-xs">Securing your payment in escrow. This usually takes a few seconds.</p>
    </div>
  );
}