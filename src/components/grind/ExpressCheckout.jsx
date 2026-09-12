import { useEffect, useState, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CreditCard, ShieldCheck } from "lucide-react";
import { money } from "@/lib/grind";
import StripeBadge from "@/components/StripeBadge";
import AppleIcon from "@/components/AppleIcon";

// Apple Pay via the Stripe Payment Request Button.
// The button is always visible — a styled placeholder until Stripe confirms
// Apple Pay is available, then the native Apple Pay button mounts in its
// place. On the published app (verified domain + Safari + iPhone) the native
// sheet opens on tap; in the builder preview iframe the placeholder stays.
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
  const [applePayReady, setApplePayReady] = useState(false);
  const payBtnRef = useRef(null);
  const buttonRef = useRef(null);

  // 1. Create PaymentIntent + load Stripe + mount the Apple Pay button.
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

        const stripe = await loadStripe(publishable_key);
        if (cancelled || !stripe) return;

        const cents = Math.round(Number(amount) * 100);
        const pr = stripe.paymentRequest({
          country: "US",
          currency: "usd",
          total: { label: payLabel || "Blockwork payment", amount: cents },
          requestPayerName: true,
          requestPayerEmail: true,
        });

        const canPay = await pr.canMakePayment();
        console.log("[ExpressCheckout] canMakePayment:", canPay);
        if (cancelled) return;

        // Only mount the native button when Apple Pay specifically is
        // available — avoids showing a Google Pay button instead.
        if (canPay && canPay.applePay) {
          const elements = stripe.elements();
          const button = elements.create("paymentRequestButton", {
            paymentRequest: pr,
            style: {
              paymentRequestButton: {
                type: "default",
                theme: "dark",
                height: "48px",
              },
            },
          });
          buttonRef.current = button;

          pr.on("paymentmethod", async (ev) => {
            console.log("[ExpressCheckout] paymentmethod event");
            const { error, paymentIntent } = await stripe.confirmCardPayment(
              client_secret,
              { payment_method: ev.paymentMethod.id }
            );
            if (error) {
              console.error(
                "[ExpressCheckout] confirmCardPayment error:",
                error.message
              );
              ev.complete("fail");
              onError?.(error.message);
            } else {
              console.log(
                "[ExpressCheckout] paymentIntent status:",
                paymentIntent.status
              );
              ev.complete("success");
              onSuccess?.();
            }
          });

          requestAnimationFrame(() => {
            if (payBtnRef.current && !cancelled) {
              button.mount(payBtnRef.current);
              setApplePayReady(true);
              console.log("[ExpressCheckout] Apple Pay button mounted");
            }
          });
        }
      } catch (err) {
        console.error("[ExpressCheckout] init error:", err);
        onError?.(err.message);
      }
    })();

    return () => {
      cancelled = true;
      if (buttonRef.current) {
        try {
          buttonRef.current.destroy();
        } catch {}
      }
    };
  }, [bookingId, jobId, amount, payLabel]);

  // Card / Stripe Checkout fallback.
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

      {/* Divider */}
      <div className="flex items-center gap-3 my-4">
        <div className="h-px bg-border flex-1" />
        <span className="text-xs text-muted-foreground">or pay instantly</span>
        <div className="h-px bg-border flex-1" />
      </div>

      {/* Apple Pay button — native Payment Request Button when available
          (published app on Safari). In the preview iframe the native sheet
          can't open, so the fallback button redirects to Stripe Checkout
          (which supports Apple Pay on Safari) for the real cost. */}
      <div ref={payBtnRef} className="w-full" style={{ minHeight: 48 }}>
        {!applePayReady && (
          <button
            type="button"
            onClick={handleCardPay}
            disabled={isDisabled}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg text-white font-semibold text-base select-none disabled:opacity-40 active:scale-[0.98] transition-transform"
            style={{ height: 48, backgroundColor: "#000" }}
          >
            <AppleIcon className="w-5 h-5" />
            Pay
          </button>
        )}
      </div>

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