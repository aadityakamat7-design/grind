import { useEffect, useState, useMemo } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, ExpressCheckoutElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CreditCard, ShieldCheck, ExternalLink } from "lucide-react";
import { money } from "@/lib/grind";
import StripeBadge from "@/components/StripeBadge";

// Apple Pay and Stripe Checkout both fail inside a cross-origin iframe
// (builder preview). Detect this up front so we can show a clear message.
const isInIframe = typeof window !== "undefined" && window.self !== window.top;

// Inner component — lives inside <Elements> so it can use the Stripe context.
// The ExpressCheckoutElement is Stripe's modern express checkout component.
// It automatically detects Apple Pay / Google Pay, renders the native button
// (the real Apple Pay button on Safari), and opens the native payment sheet
// on click. We confirm with redirect:'if_required' so the user never leaves
// the app — no Stripe Checkout redirect.
function ExpressCheckoutInner({ onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleConfirm = async () => {
    if (!stripe || !elements) return;
    setPaying(true);
    setErrorMsg("");
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: "if_required",
      });
      if (error) {
        setErrorMsg(error.message);
        onError?.(error.message);
      } else {
        onSuccess?.();
      }
    } catch (err) {
      setErrorMsg(err.message);
      onError?.(err.message);
    } finally {
      setPaying(false);
    }
  };

  return (
    <>
      <div style={{ minHeight: 48 }}>
        <ExpressCheckoutElement
          onConfirm={handleConfirm}
          options={{
            paymentMethodTypes: ["apple_pay"],
            buttonType: { applePay: "plain" },
            buttonTheme: { applePay: "black" },
            buttonHeight: 48,
            buttonBorderRadius: 0,
          }}
        />
      </div>
      {paying && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Processing payment…
        </p>
      )}
      {errorMsg && (
        <p className="text-xs text-destructive font-medium text-center mt-2">
          {errorMsg}
        </p>
      )}
    </>
  );
}

export default function ExpressCheckout({
  bookingId,
  jobId,
  amount,
  payLabel,
  cardUrl,
  onSuccess,
  onError,
  disabled,
  bookingEscrow,
}) {
  const [clientSecret, setClientSecret] = useState("");
  const [publishableKey, setPublishableKey] = useState("");
  const [cardRedirecting, setCardRedirecting] = useState(false);
  const [initError, setInitError] = useState("");

  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey]
  );

  // 1. Create the PaymentIntent via the backend function.
  useEffect(() => {
    if (!amount || amount <= 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke("createPaymentIntent", {
          bookingId,
          jobId,
          bookingEscrow,
        });
        const { client_secret, publishable_key } = res.data || {};
        if (!client_secret || !publishable_key || cancelled) return;
        setClientSecret(client_secret);
        setPublishableKey(publishable_key);
      } catch (err) {
        console.error("[ExpressCheckout] init error:", err);
        setInitError(err.message);
        onError?.(err.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId, jobId, amount, bookingEscrow]);

  // 2. Card / Stripe Checkout fallback.
  const handleCardPay = async () => {
    setCardRedirecting(true);
    setInitError("");
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
      setInitError(msg);
      onError?.(msg);
      setCardRedirecting(false);
    }
  };

  // Inside the builder preview iframe, express checkout can't work.
  if (isInIframe) {
    return (
      <div>
        <p className="text-center text-lg font-bold text-foreground mb-4">
          {payLabel || `Pay ${money(amount)} to start this job`}
        </p>
        <div className="bg-secondary border border-border rounded-2xl p-4 text-center space-y-3">
          <p className="text-sm font-semibold text-foreground">
            Apple Pay & checkout only work on the published app
          </p>
          <p className="text-xs text-muted-foreground">
            The builder preview blocks Apple Pay and Stripe Checkout for
            security. Open the live app on your iPhone to pay.
          </p>
          <a
            href="https://blockwork.online"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
          >
            <ExternalLink className="w-4 h-4" />
            Open blockwork.online
          </a>
        </div>
        <div className="mt-5 pt-4 border-t border-border">
          <StripeBadge />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Amount */}
      <p className="text-center text-lg font-bold text-foreground mb-4">
        {payLabel || `Pay ${money(amount)} to start this job`}
      </p>

      {/* Apple Pay / Google Pay via Stripe ExpressCheckoutElement.
          This is the modern Stripe component that automatically detects and
          renders the native Apple Pay button (on Safari) and opens the
          native double-click-to-pay sheet directly — no redirect. */}
      {clientSecret && stripePromise ? (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <ExpressCheckoutInner onSuccess={onSuccess} onError={onError} />
        </Elements>
      ) : (
        <div
          className="w-full bg-muted animate-pulse"
          style={{ height: 48, borderRadius: 0 }}
        />
      )}

      {/* Divider */}
      <div className="flex items-center gap-3 my-3">
        <div className="h-px bg-border flex-1" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="h-px bg-border flex-1" />
      </div>

      {/* Smaller card button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full h-9 rounded-none text-xs"
        disabled={disabled || cardRedirecting}
        onClick={handleCardPay}
      >
        <CreditCard className="w-3.5 h-3.5 mr-1.5" />
        {cardRedirecting ? "Redirecting…" : "Pay with card"}
      </Button>

      {/* Escrow info */}
      <p className="text-xs text-muted-foreground leading-snug flex items-center gap-1.5 mt-3">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        Payment held in escrow until the job is confirmed complete.
      </p>

      {initError && (
        <p className="text-xs text-destructive font-medium text-center mt-3">
          {initError}
        </p>
      )}

      {/* Stripe trust badge */}
      <div className="mt-4 pt-3 border-t border-border">
        <StripeBadge />
      </div>
    </div>
  );
}