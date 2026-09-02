import { useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { base44 } from "@/api/base44Client";
import { CreditCard, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

// Two clean payment buttons:
//   1. Apple Pay  → triggers the native Apple Pay sheet (double-click to pay)
//   2. Card       → redirects to Stripe Checkout
//
// Apple Pay uses a Stripe PaymentIntent + Express Checkout Element (hidden).
// Card calls jobHandshake(action: "start") which creates a Checkout Session
// and redirects. Both paths converge at the webhook → recordBuyerStartAfterPayment.
export default function ExpressCheckout({ bookingId, amount, onSuccess, onError, disabled }) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [applePayAvailable, setApplePayAvailable] = useState(false);
  const [cardRedirecting, setCardRedirecting] = useState(false);

  const stripeRef = useRef(null);
  const elementsRef = useRef(null);
  const expressRef = useRef(null);
  const expressElementRef = useRef(null);

  const inIframe = typeof window !== "undefined" && window.self !== window.top;

  useEffect(() => {
    if (inIframe || !amount || amount <= 0) {
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
            variables: { borderRadius: "12px", colorPrimary: "#1e3dde" },
          },
        });
        elementsRef.current = elements;

        const expressElement = elements.create("expressCheckout", {
          buttonType: { applePay: "plain" },
          buttonHeight: 48,
          paymentMethods: { applePay: "always", googlePay: "never", link: "never" },
        });
        expressElementRef.current = expressElement;

        requestAnimationFrame(() => {
          if (cancelled || !expressRef.current) return;
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
        });

        setLoading(false);
      } catch (err) {
        console.error("ExpressCheckout init error:", err);
        setLoading(false);
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
      const res = await base44.functions.invoke("jobHandshake", { bookingId, action: "start" });
      if (res.data?.url) {
        window.location.href = res.data.url;
        return;
      }
      // No URL = no charge needed or already started
      onSuccess?.();
    } catch (err) {
      const msg = err.response?.data?.error || "Couldn't start checkout. Please try again.";
      setErrorMsg(msg);
      onError?.(msg);
      setCardRedirecting(false);
    }
  };

  const triggerApplePay = () => {
    const btn = expressRef.current?.querySelector("button");
    btn?.click();
  };

  const isDisabled = disabled || processing || cardRedirecting;

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
            disabled={!applePayAvailable || isDisabled}
            className={cn(
              "h-12 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition-all duration-200 ease-ios active:scale-[0.97]",
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
            onClick={handleCardPay}
            disabled={isDisabled}
            className={cn(
              "h-12 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition-all duration-200 ease-ios active:scale-[0.97]",
              "border border-border bg-background text-foreground hover:bg-secondary hover:border-primary/40 disabled:opacity-40 disabled:pointer-events-none"
            )}
          >
            <CreditCard className="w-5 h-5" />
            Card
          </button>
        </div>
      )}

      {inIframe && !loading && (
        <div className="flex items-center gap-2 rounded-xl p-3 text-xs text-muted-foreground bg-secondary border border-border">
          <Lock className="w-4 h-4 shrink-0" />
          Apple Pay works on the published app from Safari on iPhone. Card payment works here.
        </div>
      )}

      {errorMsg && <p className="text-xs text-destructive font-medium text-center">{errorMsg}</p>}
    </div>
  );
}