import { useEffect, useState, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { base44 } from "@/api/base44Client";

// Native Apple Pay / Google Pay button using the Stripe Payment Request API.
// Shows a quick-pay button that skips the Stripe Checkout redirect — the user
// pays with Touch/Face ID without leaving the app. Falls back to the existing
// checkout flow if Apple Pay isn't available (non-Apple device, unverified
// domain, or running inside a preview iframe).
export default function ApplePayButton({ bookingId, jobId, amount, label, onSuccess, onError }) {
  const [available, setAvailable] = useState(false);
  const [processing, setProcessing] = useState(false);
  const stripeRef = useRef(null);
  const prRef = useRef(null);

  useEffect(() => {
    // Apple Pay can't run inside a preview iframe
    if (window.self !== window.top) return;
    if (!amount || amount <= 0) return;

    let cancelled = false;

    (async () => {
      try {
        // Get the Stripe publishable key from the backend
        const keyRes = await base44.functions.invoke("createPaymentIntent", {
          bookingId,
          jobId,
          getKeyOnly: true,
        });
        const pk = keyRes.data?.publishable_key;
        if (!pk || cancelled) return;

        const stripe = await loadStripe(pk);
        if (cancelled || !stripe) return;
        stripeRef.current = stripe;

        const pr = stripe.paymentRequest({
          country: "US",
          currency: "usd",
          total: { label: label || "Blockwork payment", amount: Math.round(amount * 100) },
          requestPayerName: true,
          requestPayerEmail: true,
        });
        prRef.current = pr;

        const result = await pr.canMakePayment();
        if (cancelled || !result) return;

        setAvailable(true);

        pr.on("paymentmethod", async (ev) => {
          setProcessing(true);
          try {
            // Create a PaymentIntent on the backend
            const piRes = await base44.functions.invoke("createPaymentIntent", { bookingId, jobId });
            const clientSecret = piRes.data?.client_secret;
            if (!clientSecret) {
              ev.complete("fail");
              onError?.("Couldn't start payment. Please use the card option below.");
              return;
            }

            // Confirm the payment with the Apple Pay payment method
            const { error } = await stripe.confirmCardPayment(
              clientSecret,
              { payment_method: ev.paymentMethod.id },
              { handleActions: false }
            );

            if (error) {
              ev.complete("fail");
              onError?.(error.message);
            } else {
              ev.complete("success");
              // Handle any remaining actions (e.g. 3D Secure — rare for Apple Pay)
              const { error: actionError } = await stripe.confirmCardPayment(clientSecret);
              if (actionError) {
                onError?.(actionError.message);
              } else {
                onSuccess?.();
              }
            }
          } catch (err) {
            ev.complete("fail");
            onError?.(err.message || "Payment failed. Please use the card option below.");
          }
          setProcessing(false);
        });
      } catch {
        // Silently fail — the fallback checkout button will be shown
      }
    })();

    return () => { cancelled = true; };
  }, [bookingId, jobId, amount, label]);

  if (!available) return null;

  return (
    <button
      type="button"
      onClick={() => prRef.current?.show()}
      disabled={processing}
      className="w-full h-12 rounded-full bg-black text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
    >
      {processing ? (
        <span>Processing…</span>
      ) : (
        <>
          <svg width="16" height="20" viewBox="0 0 16 20" fill="currentColor" className="shrink-0">
            <path d="M11.7 10.2c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.8 2.4-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7 1.4 0 1.8.7 3 .7 1.2 0 2-1.1 2.8-2.2.9-1.3 1.2-2.5 1.2-2.6 0 0-2.3-.9-2.4-3.5zM9.5 3.5c.6-.8 1-1.9.9-3-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.8-1.3z" />
          </svg>
          Pay with Apple Pay
        </>
      )}
    </button>
  );
}