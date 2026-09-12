import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  ExpressCheckoutElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CreditCard, ShieldCheck } from "lucide-react";
import { money } from "@/lib/grind";
import StripeBadge from "@/components/StripeBadge";

// ── Express section (must live inside <Elements>) ───────────────────────────
// The ExpressCheckoutElement is always mounted so onReady can report which
// wallets are available. The divider + button container are hidden until
// onReady confirms at least one express method (applePay / link). If none are
// available the whole section stays display:none — no orphaned divider.
function ExpressSection({ clientSecret, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [available, setAvailable] = useState(null);

  const hasExpress = !!(available && (available.applePay || available.link));

  const onConfirm = async () => {
    if (!stripe || !elements) return;
    console.log("[ExpressCheckout] onConfirm — confirming PaymentIntent");
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });
    if (error) {
      console.error("[ExpressCheckout] confirmPayment error:", error.message);
      onError?.(error.message);
      return;
    }
    console.log("[ExpressCheckout] paymentIntent status:", paymentIntent?.status);
    onSuccess?.();
  };

  return (
    <div style={{ display: hasExpress ? "block" : "none" }}>
      <div className="flex items-center gap-3 my-4">
        <div className="h-px bg-border flex-1" />
        <span className="text-xs text-muted-foreground">or pay instantly</span>
        <div className="h-px bg-border flex-1" />
      </div>
      <div className="[&>*]:w-full" style={{ minHeight: 48 }}>
        <ExpressCheckoutElement
          options={{
            paymentMethods: { applePay: "auto", link: "auto" },
            buttonType: { applePay: "plain", link: "plain" },
            buttonHeight: 48,
            layout: { maxColumns: 1, maxRows: 2 },
          }}
          onConfirm={onConfirm}
          onReady={(e) => {
            console.log(
              "[ExpressCheckout] mounted, availablePaymentMethods:",
              e.availablePaymentMethods
            );
            setAvailable(e.availablePaymentMethods);
          }}
          onLoadError={(e) =>
            console.error("[ExpressCheckout] onLoadError:", e)
          }
        />
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
// Layout:
//   1. "Pay $X to start this job"
//   2. "Pay and continue" button (card / Stripe Checkout redirect)
//   3. divider "or pay instantly"  ← hidden if no express methods
//   4. Apple Pay + Link buttons (full-width, 48px)  ← hidden if no express methods
//   5. escrow info + Stripe trust badge
export default function ExpressCheckout({
  bookingId,
  jobId,
  amount,
  payLabel,
  cardUrl,
  onSuccess,
  onError,
  disabled,
}) {
  const [cardRedirecting, setCardRedirecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [stripePromise, setStripePromise] = useState(null);

  // Create the PaymentIntent once when the component mounts.
  useEffect(() => {
    if (!amount || amount <= 0) return;
    let cancelled = false;

    (async () => {
      try {
        console.log("[ExpressCheckout] createPaymentIntent", {
          bookingId,
          jobId,
          amount,
        });
        const res = await base44.functions.invoke("createPaymentIntent", {
          bookingId,
          jobId,
        });
        const { client_secret, publishable_key } = res.data || {};
        if (!client_secret || !publishable_key || cancelled) return;
        console.log("[ExpressCheckout] got client_secret + publishable_key");
        setClientSecret(client_secret);
        setStripePromise(loadStripe(publishable_key));
      } catch (err) {
        console.error("[ExpressCheckout] createPaymentIntent error:", err);
        onError?.(err.message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bookingId, jobId, amount]);

  // Card / Stripe Checkout fallback.
  const handleCardPay = async () => {
    setCardRedirecting(true);
    setErrorMsg("");
    // Job-post flow: redirect straight to the Stripe Checkout URL created at
    // post time (the card fallback). Booking flow: create the start-payment
    // Checkout session on demand via jobHandshake.
    if (cardUrl) {
      window.location.href = cardUrl;
      return;
    }
    try {
      const res = await base44.functions.invoke("jobHandshake", {
        bookingId,
        action: "start",
        origin: window.location.origin,
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
        return;
      }
      onSuccess?.();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        "Couldn't start checkout. Please try again.";
      setErrorMsg(msg);
      onError?.(msg);
      setCardRedirecting(false);
    }
  };

  const isDisabled = disabled || cardRedirecting;

  return (
    <div>
      {/* Amount */}
      <p className="text-center text-lg font-bold text-foreground mb-4">
        {payLabel || `Pay ${money(amount)} to start this job`}
      </p>

      {/* Pay and continue — card / Stripe Checkout redirect */}
      <Button
        className="w-full h-12 rounded-full"
        disabled={isDisabled}
        onClick={handleCardPay}
      >
        <CreditCard className="w-4 h-4 mr-2" />
        {cardRedirecting ? "Redirecting…" : "Pay and continue"}
      </Button>

      {/* Express methods (Apple Pay + Link) — always mounted so onReady can
          report availability; the divider + buttons are hidden entirely until
          onReady confirms at least one express method. */}
      {stripePromise && clientSecret && (
        <Elements
          stripe={stripePromise}
          options={{ clientSecret, appearance: { theme: "stripe" } }}
        >
          <ExpressSection
            clientSecret={clientSecret}
            onSuccess={onSuccess}
            onError={onError}
          />
        </Elements>
      )}

      {/* Escrow info */}
      <p className="text-xs text-muted-foreground leading-snug flex items-center gap-1.5 mt-4">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        Payment held in escrow until the job is confirmed complete.
      </p>

      {errorMsg && (
        <p className="text-xs text-destructive font-medium text-center mt-3">
          {errorMsg}
        </p>
      )}

      {/* Stripe trust badge */}
      <div className="mt-5 pt-4 border-t border-border">
        <StripeBadge />
      </div>
    </div>
  );
}