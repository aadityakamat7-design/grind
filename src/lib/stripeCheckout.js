import { base44 } from "@/api/base44Client";

// Starts Stripe checkout for a booking. Returns { paid } if credit covered it,
// { blocked } if running inside a preview iframe, otherwise redirects to Stripe.
export async function startCheckout(bookingId) {
  const res = await base44.functions.invoke("createCheckout", { bookingId });
  const { url, paid } = res.data || {};
  if (paid) return { paid: true };
  if (window.self !== window.top) {
    alert("Checkout only works from the published app. Open your app in a new tab to complete payment.");
    return { blocked: true };
  }
  window.location.href = url;
  return {};
}