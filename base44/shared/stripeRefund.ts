import { getStripeForApp } from './stripeEnv.ts';

// Refunds the Stripe payment held in escrow for a booking, if any. Uses the
// app's current test/live mode so a test-mode charge is refunded against the
// test account and a live charge against the live account.
export async function refundHeldPayment(base44, booking) {
  if (booking.payment_status === 'held' && booking.stripe_payment_intent_id) {
    const stripe = await getStripeForApp(base44);
    await stripe.refunds.create({ payment_intent: booking.stripe_payment_intent_id });
    return true;
  }
  return false;
}