import { getStripe } from './stripeEnv.ts';

// Refunds the Stripe payment held in escrow for a booking, if any.
export async function refundHeldPayment(booking) {
  if (booking.payment_status === 'held' && booking.stripe_payment_intent_id) {
    const stripe = getStripe();
    await stripe.refunds.create({ payment_intent: booking.stripe_payment_intent_id });
    return true;
  }
  return false;
}