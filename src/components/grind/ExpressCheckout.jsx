import { useEffect, useState, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CreditCard, ShieldCheck, ExternalLink } from "lucide-react";
import { money } from "@/lib/grind";
import StripeBadge from "@/components/StripeBadge";
import ApplePayMark from "@/components/ApplePayMark";

// Apple Pay and Stripe Checkout both fail inside a cross-origin iframe
// (builder preview): canMakePayment() returns null and Stripe Checkout
// refuses to load (X-Frame-Options: DENY). Detect this up front so we can
// show a clear message instead of a silently broken button.
const isInIframe = typeof window !== "undefined" && window.self !== window.top;

// Apple Pay via a custom black button that calls paymentRequest.show().
// The native Apple Pay sheet opens directly on click — no redirect to
// Stripe Checkout. On Safari/iPhone with Apple Pay set up, this triggers
// the double-click-to-pay native sheet instantly.
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
  const [cardRedirecting, setCardRedirecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [prReady, setPrReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const prRef = useRef(null);
  const stripeRef = useRef(null);
  const clientSecretRef = useRef("");

  // 1. Create PaymentIntent + load Stripe + set up the PaymentRequest.
  // We DON'T mount the Stripe Payment Request Button — instead we store
  // the PaymentRequest in a ref and call pr.show() from our custom button.
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

        clientSecretRef.current = client_secret;
        const stripe = await loadStripe(publishable_key);
        if (cancelled || !stripe) return;
        stripeRef.current = stripe;

        const cents = Math.round(Number(amount) * 100);
        const pr = stripe.paymentRequest({
          country: "US",
          currency: "usd",
          total: { label: payLabel || "Blockwork payment", amount: cents },
          requestPayerName: true,
          requestPayerEmail: true,
        });
        prRef.current = pr;

        // Handle the payment method returned by the Apple Pay sheet.
        pr.on("paymentmethod", async (ev) => {
          setPaying(true);
          try {
            const { error, paymentIntent } = await stripe.confirmCardPayment(
              clientSecretRef.current,
              { payment_method: ev.paymentMethod.id }
            );
            if (error) {
              ev.complete("fail");
              setErrorMsg(error.message);
              onError?.(error.message);
            } else {
              ev.complete("success");
              onSuccess?.();
            }
          } catch (err) {
            ev.complete("fail");
            setErrorMsg(err.message);
            onError?.(err.message);
          } finally {
            setPaying(false);
          }
        });

        setPrReady(true);
      } catch (err) {
        console.error("[ExpressCheckout] init error:", err);
        setErrorMsg(err.message);
        onError?.(err.message);
      }
    })();

    return () => {
      cancelled = true;
      prRef.current = null;
    };
  }, [bookingId, jobId, amount, payLabel, bookingEscrow]);

  // 2. Apple Pay button click — open the native sheet directly.
  const handleApplePay = async () => {
    if (!prRef.current) {
      setErrorMsg("Still loading Apple Pay… Please wait a moment and try again.");
      return;
    }
    setErrorMsg("");
    try {
      // pr.show() opens the native Apple Pay sheet on Safari/iPhone.
      // Must be called in response to a user click (it is).
      await prRef.current.show();
    } catch (err) {
      console.error("[ExpressCheckout] pr.show() error:", err);
      // canMakePayment() returned null — Apple Pay not available on this
      // device/browser. Show a clear error instead of redirecting.
      setErrorMsg(
        "Apple Pay isn't available here. Use Safari on iPhone or Mac with Apple Pay set up, or pay with card below."
      );
      onError?.(err.message);
    }
  };

  // 3. Card / Stripe Checkout fallback.
  const handleCardPay = async () => {
    setCardRedirecting(true);
    setErrorMsg("");
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

  // Inside the builder preview iframe, neither Apple Pay nor Stripe Checkout
  // can work. Show a clear message directing the user to the published app.
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
            The builder preview blocks Apple Pay and Stripe Checkout for security. Open the live app on your iPhone to pay.
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

      {/* Apple Pay button — official Apple Pay mark on a black button.
          Clicking opens the native Apple Pay sheet (double-click to pay on
          iPhone) directly — no redirect. */}
      <button
        type="button"
        onClick={handleApplePay}
        disabled={disabled || paying || !prReady}
        className="w-full flex items-center justify-center rounded-lg bg-black text-white font-semibold select-none disabled:opacity-40 active:scale-[0.98] transition-transform"
        style={{ height: 48 }}
      >
        {paying ? (
          <span className="flex items-center gap-2 text-sm">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processing…
          </span>
        ) : (
          <ApplePayMark className="h-6" />
        )}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 my-4">
        <div className="h-px bg-border flex-1" />
        <span className="text-xs text-muted-foreground">or pay with card</span>
        <div className="h-px bg-border flex-1" />
      </div>

      {/* Card / Stripe Checkout redirect */}
      <Button
        className="w-full h-12 rounded-full"
        disabled={disabled || cardRedirecting}
        onClick={handleCardPay}
      >
        <CreditCard className="w-4 h-4 mr-2" />
        {cardRedirecting ? "Redirecting…" : "Pay with card"}
      </Button>

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