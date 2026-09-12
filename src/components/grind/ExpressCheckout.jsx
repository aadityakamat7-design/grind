import { useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { money } from "@/lib/grind";
import StripeBadge from "@/components/StripeBadge";

// Payment step layout (top to bottom):
//   1. "Pay $X to start this job"
//   2. Apple Pay button (official Apple Pay mark) — renders only on Apple
//      devices on a verified domain. Tapping it opens the native Apple Pay
//      sheet for the exact booking amount, no redirect.
//   3. Divider "or pay with card"
//   4. "Pay and continue" → redirects to Stripe hosted Checkout (card/Link)
//
// On non-Apple devices (or before domain verification completes), the Apple
// Pay button and divider are hidden — only the card button shows.
export default function ExpressCheckout({ bookingId, amount, onSuccess, onError, disabled }) {
  const [processing, setProcessing] = useState(false);
  const [cardRedirecting, setCardRedirecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [applePayAvailable, setApplePayAvailable] = useState(false);

  const buttonRef = useRef(null);
  const prButtonRef = useRef(null);

  // Initialise the Apple Pay (Payment Request) button. Stripe's
  // canMakePayment() reports whether Apple Pay is available on this device +
  // domain. If it is, we mount the official Apple Pay button, which opens the
  // native Apple Pay sheet on tap — no redirect, instant pay for the amount.
  useEffect(() => {
    if (!amount || amount <= 0) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await base44.functions.invoke("createPaymentIntent", { bookingId });
        const { client_secret, publishable_key } = res.data || {};
        if (!client_secret || !publishable_key || cancelled) return;

        const stripe = await loadStripe(publishable_key);
        if (cancelled || !stripe) return;

        const cents = Math.round(Number(amount) * 100);
        const pr = stripe.paymentRequest({
          country: "US",
          currency: "usd",
          total: { label: "Job escrow", amount: cents },
          requestPayerName: true,
          requestPayerEmail: true,
        });

        const canPay = await pr.canMakePayment();
        if (cancelled || !canPay || !canPay.applePay) return;

        setApplePayAvailable(true);
        const elements = stripe.elements();
        const prButton = elements.create("paymentRequestButton", {
          paymentRequest: pr,
          style: {
            paymentRequestButton: {
              type: "default",
              theme: "dark",
              height: "48px",
            },
          },
        });
        prButtonRef.current = prButton;

        requestAnimationFrame(() => {
          if (cancelled || !buttonRef.current) return;
          prButton.mount(buttonRef.current);
        });

        pr.on("paymentmethod", async (ev) => {
          setProcessing(true);
          setErrorMsg("");
          const { paymentIntent, error } = await stripe.confirmCardPayment(
            client_secret,
            { payment_method: ev.paymentMethod.id },
            { handleActions: false }
          );
          if (error) {
            ev.complete("fail");
            setErrorMsg(error.message);
            onError?.(error.message);
            setProcessing(false);
            return;
          }
          ev.complete("success");
          if (paymentIntent && paymentIntent.status === "requires_action") {
            const { error: actionError } = await stripe.confirmCardPayment(client_secret);
            if (actionError) {
              setErrorMsg(actionError.message);
              onError?.(actionError.message);
              setProcessing(false);
              return;
            }
          }
          onSuccess?.();
        });
        pr.on("cancel", () => setProcessing(false));
      } catch (err) {
        console.error("Apple Pay init error:", err);
      }
    })();

    return () => {
      cancelled = true;
      try { prButtonRef.current?.destroy(); } catch {}
      prButtonRef.current = null;
    };
  }, [bookingId, amount]);

  const handleCardPay = async () => {
    setCardRedirecting(true);
    setErrorMsg("");
    try {
      const res = await base44.functions.invoke("jobHandshake", { bookingId, action: "start", origin: window.location.origin });
      if (res.data?.url) {
        window.location.href = res.data.url;
        return;
      }
      onSuccess?.();
    } catch (err) {
      const msg = err.response?.data?.error || "Couldn't start checkout. Please try again.";
      setErrorMsg(msg);
      onError?.(msg);
      setCardRedirecting(false);
    }
  };

  const isDisabled = disabled || processing || cardRedirecting;

  return (
    <div>
      {/* Amount */}
      <p className="text-center text-lg font-bold text-foreground mb-4">
        Pay {money(amount)} to start this job
      </p>

      {/* Apple Pay button — official Apple Pay mark, opens the native sheet.
          Only rendered when canMakePayment() confirms Apple Pay is available
          (Apple device + verified domain). Hidden otherwise, no empty gap. */}
      {applePayAvailable && (
        <div className="space-y-3">
          <div ref={buttonRef} />
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">or pay with card</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        </div>
      )}

      {/* Card / hosted Checkout fallback */}
      <Button
        className="w-full"
        size="lg"
        disabled={isDisabled}
        onClick={handleCardPay}
      >
        <CreditCard className="w-4 h-4" />
        {cardRedirecting ? "Redirecting…" : applePayAvailable ? "Pay with card" : "Pay and continue"}
      </Button>

      {errorMsg && <p className="text-xs text-destructive font-medium text-center mt-3">{errorMsg}</p>}

      {/* Stripe trust badge — reassures users their card details go to Stripe. */}
      <div className="mt-5 pt-4 border-t border-border">
        <StripeBadge />
      </div>
    </div>
  );
}