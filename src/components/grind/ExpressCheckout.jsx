import { useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { money } from "@/lib/grind";
import StripeBadge from "@/components/StripeBadge";

// Payment step layout (top to bottom):
//   1. "Pay $X to start this job"
//   2. Primary "Pay and continue" button → redirects to Stripe hosted Checkout
//   3. Divider "or pay instantly"
//   4. Express Checkout Element → Apple Pay + Link (native, rendered by Stripe)
//
// If no express methods are available on the device, the divider and express
// section are hidden entirely — just the primary button shows, no empty gap.
// All three paths charge the same amount and fire the same webhook.
export default function ExpressCheckout({ bookingId, amount, onSuccess, onError, disabled }) {
  const [processing, setProcessing] = useState(false);
  const [cardRedirecting, setCardRedirecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hasExpressMethods, setHasExpressMethods] = useState(false);

  const stripeRef = useRef(null);
  const elementsRef = useRef(null);
  const expressRef = useRef(null);
  const expressElementRef = useRef(null);

  // Initialise the Express Checkout Element in the background. Stripe's
  // `paymentMethods: "auto"` shows only methods available on the current
  // device: Apple Pay appears on verified domains in Safari, Link appears
  // everywhere else (including inside the builder preview iframe). The
  // divider + express section are hidden entirely if nothing renders.
  useEffect(() => {
    if (!amount || amount <= 0) return;

    console.log("[ExpressCheckout] mounted", { bookingId, amount });

    let cancelled = false;

    (async () => {
      try {
        const res = await base44.functions.invoke("createPaymentIntent", { bookingId });
        const { client_secret, publishable_key } = res.data || {};
        console.log("[ExpressCheckout] createPaymentIntent", {
          hasClientSecret: !!client_secret,
          hasPublishableKey: !!publishable_key,
          clientSecretPrefix: client_secret ? client_secret.slice(0, 10) : null,
        });
        if (!client_secret || !publishable_key || cancelled) return;

        const stripe = await loadStripe(publishable_key);
        if (cancelled || !stripe) return;
        stripeRef.current = stripe;

        const elements = stripe.elements({
          clientSecret: client_secret,
          appearance: {
            theme: "stripe",
            variables: { borderRadius: "12px", colorPrimary: "#1e3dde" },
          },
        });
        elementsRef.current = elements;

        const expressElement = elements.create("expressCheckout", {
          buttonType: { applePay: "plain" },
          buttonHeight: 48,
          paymentMethods: {
            applePay: "auto",
            link: "auto",
          },
        });
        expressElementRef.current = expressElement;

        requestAnimationFrame(() => {
          if (cancelled || !expressRef.current) return;
          expressElement.mount(expressRef.current);
          // availablepaymentmethodschange fires on initial render and reports
          // exactly which express methods Stripe considers available on this
          // device/domain. This is the authoritative diagnostic signal — it
          // separates "Apple Pay not available" (domain/device issue) from
          // "available but not rendering" (CSS/layout issue).
          expressElement.on("availablepaymentmethodschange", (event) => {
            console.log("[ExpressCheckout] availablePaymentMethods", event?.paymentMethods);
          });
          expressElement.on("ready", () => {
            setTimeout(() => {
              if (cancelled) return;
              const el = expressRef.current;
              const hasButtons = !!(el && el.children.length > 0 && el.offsetHeight > 0);
              setHasExpressMethods(hasButtons);
            }, 300);
          });
          expressElement.on("confirm", async () => {
            setProcessing(true);
            setErrorMsg("");
            const { error } = await stripe.confirmPayment({
              elements,
              redirect: "if_required",
              confirmParams: {
                return_url: `${window.location.origin}/bookings/${bookingId}?started=1`,
              },
            });
            if (error) {
              setErrorMsg(error.message);
              onError?.(error.message);
              setProcessing(false);
            } else {
              onSuccess?.();
            }
          });
          expressElement.on("cancel", () => setProcessing(false));
        });
      } catch (err) {
        console.error("ExpressCheckout init error:", err);
      }
    });

    return () => {
      cancelled = true;
      try { expressElementRef.current?.destroy(); } catch {}
      expressElementRef.current = null;
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

      {/* Primary button — Pay and continue (redirects to hosted Checkout) */}
      <Button
        className="w-full"
        size="lg"
        disabled={isDisabled}
        onClick={handleCardPay}
      >
        <CreditCard className="w-4 h-4" />
        {cardRedirecting ? "Redirecting…" : "Pay and continue"}
      </Button>

      {/* Divider — only when express methods are available */}
      {hasExpressMethods && (
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium">or pay instantly</span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      {/* Express Checkout Element — Apple Pay + Link (auto-hidden if unavailable).
          Container must be visible (not clipped) so Stripe can detect available
          payment methods and render the native buttons. If none render, the div
          stays empty (0 height) and the divider above hides — no gap. */}
      <div ref={expressRef} />

      {errorMsg && <p className="text-xs text-destructive font-medium text-center mt-3">{errorMsg}</p>}

      {/* Stripe trust badge — at the moment of purchase, right beneath the
          payment buttons. Reassures users their card details go to Stripe. */}
      <div className="mt-5 pt-4 border-t border-border">
        <StripeBadge />
      </div>
    </div>
  );
}