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

// Apple Pay via the Stripe Payment Request Button — the real, native
// Apple Pay button element that Safari renders. On iPhone, tapping it
// opens the native double-click-to-pay sheet directly.
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
  const [applePayReady, setApplePayReady] = useState(false);
  const [applePayUnavailable, setApplePayUnavailable] = useState(false);
  const [paying, setPaying] = useState(false);
  const payBtnRef = useRef(null);
  const buttonRef = useRef(null);
  const prRef = useRef(null);

  // 1. Create PaymentIntent + load Stripe + mount the native Apple Pay button.
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
        prRef.current = pr;

        pr.on("paymentmethod", async (ev) => {
          setPaying(true);
          try {
            const { error, paymentIntent } = await stripe.confirmCardPayment(
              client_secret,
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

        const canPay = await pr.canMakePayment();
        if (cancelled) return;

        if (canPay && canPay.applePay) {
          const elements = stripe.elements();
          const button = elements.create("paymentRequestButton", {
            paymentRequest: pr,
            style: {
              paymentRequestButton: {
                type: "default",
                theme: "dark",
                height: "48px",
                borderRadius: "0px",
              },
            },
          });
          buttonRef.current = button;

          requestAnimationFrame(() => {
            if (payBtnRef.current && !cancelled) {
              button.mount(payBtnRef.current);
              setApplePayReady(true);
            }
          });
        } else {
          // Apple Pay not available on this device/browser — show the
          // custom fallback button that tries pr.show() on click.
          setApplePayUnavailable(true);
        }
      } catch (err) {
        console.error("[ExpressCheckout] init error:", err);
        setErrorMsg(err.message);
        onError?.(err.message);
      }
    })();

    return () => {
      cancelled = true;
      if (buttonRef.current) {
        try { buttonRef.current.destroy(); } catch {}
      }
    };
  }, [bookingId, jobId, amount, payLabel, bookingEscrow]);

  // 2. Fallback Apple Pay button — calls pr.show() to try opening the sheet.
  const handleApplePayFallback = async () => {
    if (!prRef.current) return;
    setErrorMsg("");
    try {
      await prRef.current.show();
    } catch (err) {
      setErrorMsg("Apple Pay isn't available on this device. Use Safari on iPhone or Mac, or pay with card below.");
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

      {/* Apple Pay button — the real Stripe Payment Request Button (native
          Apple Pay element) in a square container. On Safari/iPhone this is
          the actual Apple Pay button that opens the double-click-to-pay sheet. */}
      <div
        ref={payBtnRef}
        className="w-full"
        style={{ minHeight: 48, borderRadius: 0, overflow: "hidden" }}
      />
      {!applePayReady && !applePayUnavailable && (
        <div
          className="w-full bg-muted animate-pulse"
          style={{ height: 48, borderRadius: 0 }}
        />
      )}
      {applePayUnavailable && (
        <button
          type="button"
          onClick={handleApplePayFallback}
          disabled={disabled || paying}
          className="w-full flex items-center justify-center bg-black text-white font-semibold select-none disabled:opacity-40 active:scale-[0.98] transition-transform"
          style={{ height: 48, borderRadius: 0 }}
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

      {errorMsg && (
        <p className="text-xs text-destructive font-medium text-center mt-3">
          {errorMsg}
        </p>
      )}

      {/* Stripe trust badge */}
      <div className="mt-4 pt-3 border-t border-border">
        <StripeBadge />
      </div>
    </div>
  );
}