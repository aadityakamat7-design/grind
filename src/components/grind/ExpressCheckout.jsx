import { useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { base44 } from "@/api/base44Client";
import { CreditCard, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { money } from "@/lib/grind";

// Stripe Express Checkout Element — renders native Apple Pay, Google Pay,
// and Link buttons automatically. Unavailable methods are hidden by Stripe.
// Below the express buttons: a divider and a "Pay with card" button that
// redirects to Stripe's hosted Checkout.
//
// All three paths charge the same amount via the same PaymentIntent / Checkout
// Session, fire the same webhook, and set payment_status: 'held' identically.
export default function ExpressCheckout({ bookingId, amount, onSuccess, onError, disabled }) {
  const [processing, setProcessing] = useState(false);
  const [cardRedirecting, setCardRedirecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hasExpressMethods, setHasExpressMethods] = useState(false);

  const stripeRef = useRef(null);
  const elementsRef = useRef(null);
  const expressRef = useRef(null);
  const expressElementRef = useRef(null);

  const inIframe = typeof window !== "undefined" && window.self !== window.top;

  // Initialise the Express Checkout Element in the background (skipped in
  // iframe — the card button still works everywhere).
  useEffect(() => {
    if (inIframe || !amount || amount <= 0) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await base44.functions.invoke("createPaymentIntent", { bookingId });
        const { client_secret, publishable_key } = res.data || {};
        if (!client_secret || !publishable_key || cancelled) return;

        const stripe = await loadStripe(publishable_key);
        if (cancelled || !stripe) return;
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

        const expressElement = elements.create("expressCheckout", {
          buttonType: { applePay: "plain", googlePay: "plain" },
          buttonHeight: 48,
          paymentMethods: {
            applePay: "always",
            googlePay: "always",
            link: "always",
          },
        });
        expressElementRef.current = expressElement;

        requestAnimationFrame(() => {
          if (cancelled || !expressRef.current) return;
          expressElement.mount(expressRef.current);
          expressElement.on("ready", () => {
            // Give Stripe a moment to render the available buttons, then check
            // if any actually appeared. If none did, we hide the divider and
            // show only the card option — no empty gap.
            setTimeout(() => {
              if (cancelled) return;
              const hasButtons = !!(expressRef.current && expressRef.current.children.length > 0);
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
      const res = await base44.functions.invoke("jobHandshake", { bookingId, action: "start" });
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
      {/* Amount shown clearly above the buttons */}
      <p className="text-center text-lg font-bold text-foreground mb-4">
        Pay {money(amount)} to start this job
      </p>

      {/* Express Checkout Element — Apple Pay, Google Pay, Link (auto-hidden if unavailable) */}
      <div ref={expressRef} />

      {/* Divider — only when express methods rendered */}
      {hasExpressMethods && (
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      {/* Card button — redirects to Stripe hosted Checkout */}
      <button
        type="button"
        onClick={handleCardPay}
        disabled={isDisabled}
        className={cn(
          "w-full h-12 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition-all duration-200 ease-ios active:scale-[0.97]",
          "border border-border bg-background text-foreground hover:bg-secondary hover:border-primary/40 disabled:opacity-40 disabled:pointer-events-none"
        )}
      >
        <CreditCard className="w-5 h-5" />
        Pay with card
      </button>

      {inIframe && (
        <div className="flex items-center gap-2 rounded-xl p-3 text-xs text-muted-foreground bg-secondary border border-border mt-4">
          <Lock className="w-4 h-4 shrink-0" />
          Apple Pay &amp; Google Pay work on the published app from your phone. Card payment works here.
        </div>
      )}

      {errorMsg && <p className="text-xs text-destructive font-medium text-center mt-3">{errorMsg}</p>}
    </div>
  );
}