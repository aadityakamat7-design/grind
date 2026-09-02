import { useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CreditCard, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

// Two clean payment buttons:
//   1. Apple Pay logo  → triggers the native Apple Pay sheet on iPhone/Safari
//   2. Card icon       → reveals the Stripe card form
// The Stripe Express Checkout Element is mounted hidden and only used to
// trigger Apple Pay's native sheet — no Google Pay / Link / Amazon buttons.
export default function ExpressCheckout({ bookingId, amount, label, onSuccess, onError }) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [applePayAvailable, setApplePayAvailable] = useState(false);
  const [showCard, setShowCard] = useState(false);

  const stripeRef = useRef(null);
  const elementsRef = useRef(null);
  const expressRef = useRef(null);
  const paymentRef = useRef(null);
  const expressElementRef = useRef(null);
  const paymentElementRef = useRef(null);

  useEffect(() => {
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

        // Express Checkout — Apple Pay only
        const expressElement = elements.create("expressCheckout", {
          buttonType: { applePay: "plain" },
          buttonHeight: 48,
          paymentMethods: { applePay: "always", googlePay: "never", link: "never" },
        });
        expressElementRef.current = expressElement;

        const paymentElement = elements.create("payment", {
          layout: { type: "tabs", defaultCollapsed: false },
        });
        paymentElementRef.current = paymentElement;

        requestAnimationFrame(() => {
          if (cancelled) return;

          if (expressRef.current) {
            expressElement.mount(expressRef.current);
            expressElement.on("ready", () => {
              setTimeout(() => {
                if (!cancelled && expressRef.current && expressRef.current.children.length > 0) {
                  setApplePayAvailable(true);
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

          // Payment Element — mounted lazily when card is toggled
        });

        setLoading(false);
      } catch (err) {
        console.error("ExpressCheckout init error:", err);
        setErrorMsg("Couldn't load payment options. Please refresh the page.");
        setLoading(false);
      }
    });

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

  // Mount the card form only when the user taps the card button
  useEffect(() => {
    if (showCard && paymentRef.current && paymentElementRef.current && !paymentElementRef.current._mounted) {
      try {
        paymentElementRef.current.mount(paymentRef.current);
        paymentElementRef.current._mounted = true;
      } catch {}
    }
  }, [showCard]);

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

  const triggerApplePay = () => {
    // Click the hidden Stripe Apple Pay button to open the native sheet
    const btn = expressRef.current?.querySelector("button");
    btn?.click();
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
      {/* Hidden Stripe express element — only used to trigger Apple Pay */}
      <div ref={expressRef} className="hidden" aria-hidden="true" />

      {loading && <div className="h-12 rounded-xl bg-muted animate-pulse" />}

      {!loading && (
        <div className="grid grid-cols-2 gap-3">
          {/* Apple Pay button */}
          <button
            type="button"
            onClick={triggerApplePay}
            disabled={!applePayAvailable || processing}
            className={cn(
              "h-12 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition-all duration-200 ease-ios",
              "bg-black text-white hover:bg-black/90 disabled:opacity-40 disabled:pointer-events-none"
            )}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M17.05 12.04c-.03-2.6 2.13-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.88 2.65 3.22 2.6 1.3-.05 1.79-.83 3.36-.83 1.57 0 2.01.83 3.39.81 1.4-.03 2.29-1.27 3.14-2.53.99-1.45 1.4-2.86 1.42-2.93-.03-.01-2.72-1.04-2.75-4.13zM14.6 4.6c.72-.87 1.2-2.08 1.07-3.29-1.03.04-2.28.69-3.02 1.56-.67.77-1.25 2-1.1 3.18 1.15.09 2.33-.58 3.05-1.45z"/>
            </svg>
            Pay
          </button>

          {/* Card button */}
          <button
            type="button"
            onClick={() => setShowCard(true)}
            disabled={processing}
            className={cn(
              "h-12 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition-all duration-200 ease-ios active:scale-[0.97]",
              "border border-border bg-background text-foreground hover:bg-secondary hover:border-primary/40"
            )}
          >
            <CreditCard className="w-5 h-5" />
            Card
          </button>
        </div>
      )}

      {/* Card form — revealed when card button is tapped */}
      {showCard && (
        <form onSubmit={handleCardSubmit} className="space-y-3 pt-1">
          <div ref={paymentRef} />
          <Button type="submit" disabled={processing} className="w-full">
            {processing ? "Processing…" : `Pay $${Number(amount).toFixed(2)}`}
          </Button>
        </form>
      )}

      {errorMsg && (
        <p className="text-xs text-destructive font-medium text-center">{errorMsg}</p>
      )}
    </div>
  );
}