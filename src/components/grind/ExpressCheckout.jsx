import { useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

// Express checkout (Apple Pay, Google Pay, Link) + embedded card form.
// Uses Stripe's Express Checkout Element and Payment Element — no custom
// payment buttons, no card data handled directly. Both paths confirm the
// same PaymentIntent, so the webhook handles them identically (sets
// buyer_started_at + payment_status: 'held', same as a card payment).
//
// The Express Checkout Element automatically shows only the buttons
// available on the current device/browser:
//   Apple Pay  → Safari/iOS with Apple Pay set up
//   Google Pay → Chrome/Android with Google Pay set up
//   Link       → returning users with a Link account
// On unsupported environments the buttons hide automatically — no broken
// or non-functional buttons are ever shown.
export default function ExpressCheckout({ bookingId, amount, label, onSuccess, onError }) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hasExpressButtons, setHasExpressButtons] = useState(false);

  const stripeRef = useRef(null);
  const elementsRef = useRef(null);
  const expressRef = useRef(null);
  const paymentRef = useRef(null);
  const expressElementRef = useRef(null);
  const paymentElementRef = useRef(null);

  useEffect(() => {
    // Apple Pay / Google Pay can't run inside a preview iframe
    if (window.self !== window.top) {
      setLoading(false);
      return;
    }
    if (!amount || amount <= 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await base44.functions.invoke("createPaymentIntent", { bookingId });
        const { client_secret, publishable_key } = res.data || {};
        if (!client_secret || !publishable_key || cancelled) {
          setLoading(false);
          return;
        }

        const stripe = await loadStripe(publishable_key);
        if (cancelled || !stripe) {
          setLoading(false);
          return;
        }
        stripeRef.current = stripe;

        const elements = stripe.elements({
          clientSecret: client_secret,
          appearance: {
            theme: "stripe",
            variables: {
              borderRadius: "12px",
              colorPrimary: "#1e3dde",
            },
          },
        });
        elementsRef.current = elements;

        // Express Checkout Element — Apple Pay, Google Pay, Link buttons.
        const expressElement = elements.create("expressCheckout", {
          buttonType: { applePay: "plain", googlePay: "plain" },
          buttonHeight: 48,
        });
        expressElementRef.current = expressElement;

        // Payment Element — card form fallback
        const paymentElement = elements.create("payment", {
          layout: { type: "tabs", defaultCollapsed: false },
        });
        paymentElementRef.current = paymentElement;

        // Mount after refs are rendered
        requestAnimationFrame(() => {
          if (cancelled) return;

          if (expressRef.current) {
            expressElement.mount(expressRef.current);
            expressElement.on("ready", () => {
              // Check if any express buttons are actually rendered — the
              // element renders an empty container when no methods are
              // available on this device/browser.
              setTimeout(() => {
                if (!cancelled && expressRef.current && expressRef.current.children.length > 0) {
                  setHasExpressButtons(true);
                }
              }, 200);
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
          }

          if (paymentRef.current) {
            paymentElement.mount(paymentRef.current);
          }
        });

        setLoading(false);
      } catch (err) {
        console.error("ExpressCheckout init error:", err);
        setErrorMsg("Couldn't load payment options. Please refresh the page.");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      try {
        expressElementRef.current?.destroy();
        paymentElementRef.current?.destroy();
      } catch {}
      expressElementRef.current = null;
      paymentElementRef.current = null;
    };
  }, [bookingId, amount]);

  const handleCardSubmit = async (e) => {
    e.preventDefault();
    if (!stripeRef.current || !elementsRef.current) return;
    setProcessing(true);
    setErrorMsg("");
    const { error } = await stripeRef.current.confirmPayment({
      elements: elementsRef.current,
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
  };

  // Preview iframe — express payment can't run
  if (window.self !== window.top) {
    return (
      <div className="flex items-center gap-2 rounded-xl p-3 text-xs text-muted-foreground bg-secondary border border-border">
        <Lock className="w-4 h-4 shrink-0" />
        Open the app in a new tab to pay — checkout doesn't work inside a preview.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Express checkout buttons (Apple Pay, Google Pay, Link) */}
      <div ref={expressRef} className="[&>div]:w-full" />

      {/* Loading placeholder for express area */}
      {loading && <div className="h-12 rounded-xl bg-muted animate-pulse" />}

      {/* Divider — only shown when express buttons are available */}
      {hasExpressButtons && !loading && (
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium">or pay with card</span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      {/* Card form (Payment Element) */}
      <form onSubmit={handleCardSubmit} className="space-y-3">
        <div ref={paymentRef} />
        {loading ? (
          <div className="h-12 rounded-xl bg-muted animate-pulse" />
        ) : (
          <Button type="submit" disabled={processing} className="w-full">
            {processing ? "Processing…" : `Pay $${Number(amount).toFixed(2)}`}
          </Button>
        )}
      </form>

      {errorMsg && (
        <p className="text-xs text-destructive font-medium text-center">{errorMsg}</p>
      )}
    </div>
  );
}