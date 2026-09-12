import { useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CreditCard, ShieldCheck } from "lucide-react";
import { money } from "@/lib/grind";
import StripeBadge from "@/components/StripeBadge";

// Official-ish Apple Pay mark used as the instant placeholder. The real Stripe
// Payment Request Button mounts on top once canMakePayment() confirms Apple Pay.
function ApplePayMark() {
  return (
    <span className="flex items-center gap-1.5 text-white">
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.51-2.54 3.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
      </svg>
      <span className="font-medium tracking-tight">Pay</span>
    </span>
  );
}

// Google Pay mark placeholder.
function GooglePayMark() {
  return (
    <span className="flex items-center gap-1.5 text-white">
      <span className="font-bold text-lg leading-none" style={{ fontFamily: "Inter, sans-serif" }}>
        <span style={{ color: "#4285F4" }}>G</span>
      </span>
      <span className="font-medium tracking-tight">Pay</span>
    </span>
  );
}

// Payment step layout:
//   1. "Pay $X to start this job"
//   2. Apple Pay button (instant placeholder → native sheet when ready)
//   3. Google Pay button (instant placeholder → native sheet when ready)
//   4. Row: small "Pay with card" button (left) + escrow info (right)
//   5. Stripe trust badge
//
// Placeholders render instantly so there's no blank gap while Stripe.js loads.
// When a native wallet is available, the real Payment Request Button swaps in
// and opens the native sheet on tap. When it isn't, the placeholder redirects
// to Stripe hosted Checkout (which supports that wallet) — so every button is
// always functional.
export default function ExpressCheckout({ bookingId, amount, onSuccess, onError, disabled }) {
  const [processing, setProcessing] = useState(false);
  const [cardRedirecting, setCardRedirecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [applePayReady, setApplePayReady] = useState(false);
  const [googlePayReady, setGooglePayReady] = useState(false);

  const appleBtnRef = useRef(null);
  const googleBtnRef = useRef(null);

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
        const label = "Job escrow";

        const confirmPayment = async (ev) => {
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
          if (paymentIntent?.status === "requires_action") {
            const { error: actionError } = await stripe.confirmCardPayment(client_secret);
            if (actionError) {
              setErrorMsg(actionError.message);
              onError?.(actionError.message);
              setProcessing(false);
              return;
            }
          }
          onSuccess?.();
        };

        // canMakePayment() reports which specific wallets are available
        // (e.g. { applePay: true } or { googlePay: true }). Only mount a slot
        // when ITS wallet is available, so the two buttons stay distinct
        // instead of both rendering whatever the browser supports first.
        const mountWallet = async (pr, setReady, btnRef, walletKey) => {
          const can = await pr.canMakePayment();
          if (cancelled || !can || !can[walletKey]) return;
          setReady(true);
          const elements = stripe.elements();
          const btn = elements.create("paymentRequestButton", {
            paymentRequest: pr,
            style: { paymentRequestButton: { type: "default", theme: "dark", height: "48px" } },
          });
          requestAnimationFrame(() => {
            if (cancelled || !btnRef.current) return;
            btn.mount(btnRef.current);
          });
          pr.on("paymentmethod", confirmPayment);
          pr.on("cancel", () => setProcessing(false));
        };

        await mountWallet(
          stripe.paymentRequest({ country: "US", currency: "usd", total: { label, amount: cents }, requestPayerName: true, requestPayerEmail: true }),
          setApplePayReady,
          appleBtnRef,
          "applePay"
        );
        await mountWallet(
          stripe.paymentRequest({ country: "US", currency: "usd", total: { label, amount: cents }, requestPayerName: true, requestPayerEmail: true }),
          setGooglePayReady,
          googleBtnRef,
          "googlePay"
        );
      } catch (err) {
        console.error("Wallet init error:", err);
      }
    })();

    return () => { cancelled = true; };
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

      {/* Google Pay — instant placeholder swaps to the native button when ready.
          If Google Pay isn't available, the placeholder redirects to Checkout. */}
      <div className="h-12 mb-3">
        {googlePayReady ? (
          <div ref={googleBtnRef} className="h-12 [&>*]:w-full" />
        ) : (
          <button
            type="button"
            disabled={isDisabled}
            onClick={handleCardPay}
            className="w-full h-12 rounded-full bg-black flex items-center justify-center transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <GooglePayMark />
          </button>
        )}
      </div>

      {/* Apple Pay — same pattern. */}
      <div className="h-12 mb-4">
        {applePayReady ? (
          <div ref={appleBtnRef} className="h-12 [&>*]:w-full" />
        ) : (
          <button
            type="button"
            disabled={isDisabled}
            onClick={handleCardPay}
            className="w-full h-12 rounded-full bg-black flex items-center justify-center transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <ApplePayMark />
          </button>
        )}
      </div>

      {/* Small card button (left) + escrow info (right) */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={isDisabled}
          onClick={handleCardPay}
          className="shrink-0"
        >
          <CreditCard className="w-3.5 h-3.5" />
          {cardRedirecting ? "Redirecting…" : "Pay with card"}
        </Button>
        <p className="text-xs text-muted-foreground leading-snug flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          Payment held in escrow until the job is confirmed complete.
        </p>
      </div>

      {errorMsg && <p className="text-xs text-destructive font-medium text-center mt-3">{errorMsg}</p>}

      {/* Stripe trust badge */}
      <div className="mt-5 pt-4 border-t border-border">
        <StripeBadge />
      </div>
    </div>
  );
}