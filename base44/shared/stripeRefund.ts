// Refunds the Stripe charge for a booking. Hard guards ensure a refund is
// never issued on a booking with no captured payment, and the wallet balance
// can never go below zero.
import { getStripeForApp } from './stripeEnv.ts';
import { assertRefundable } from './bookingStateMachine.ts';

// Refunds an escrow-held booking. The booking MUST have payment_status 'held'
// and a real Stripe payment intent. Throws on guard failure — never silently
// returns false. This is the hard guard that prevents refunding an unpaid
// booking and creating negative debt.
export async function refundEscrowPayment(base44, booking) {
  assertRefundable(booking); // throws if not refundable

  // Sub-minimum charges have a synthetic payment intent (submin_*) — no real
  // Stripe charge exists to refund. Just return true; the caller marks the
  // booking as refunded.
  if (booking.stripe_payment_intent_id?.startsWith('submin_')) {
    return true;
  }

  const stripe = await getStripeForApp(base44);
  await stripe.refunds.create({ payment_intent: booking.stripe_payment_intent_id });
  return true;
}

// Reverses a released booking's wallet credit (dispute resolution). Refunds
// the original Stripe charge AND reverses the teen's wallet credit, but the
// wallet balance is clamped at ZERO — it can NEVER go negative. If the teen
// already withdrew the funds, the platform absorbs the shortfall and it's
// logged for manual resolution.
export async function reverseReleasedPayment(base44, booking) {
  if (!booking.stripe_payment_intent_id) {
    throw new Error(`reverseReleasedPayment: booking ${booking.id} has no Stripe payment intent.`);
  }
  if (booking.payment_status !== 'released') {
    throw new Error(`reverseReleasedPayment: booking ${booking.id} is not released (payment_status: ${booking.payment_status}).`);
  }

  const stripe = await getStripeForApp(base44);
  await stripe.refunds.create({ payment_intent: booking.stripe_payment_intent_id });

  const svc = base44.asServiceRole.entities;
  const teenGets = Number(booking.net_amount) || 0;
  if (teenGets > 0) {
    const wallets = await svc.WalletAccount.filter({ teen_user_id: booking.teen_user_id });
    if (wallets[0]) {
      const currentBalance = Number(wallets[0].balance) || 0;
      // HARD ZERO-FLOOR: the wallet can never go below zero.
      const newBalance = Math.max(0, Math.round((currentBalance - teenGets) * 100) / 100);
      const actualReversal = Math.round((currentBalance - newBalance) * 100) / 100;
      await svc.WalletAccount.update(wallets[0].id, { balance: newBalance });
      await svc.WalletTransaction.create({
        teen_user_id: booking.teen_user_id,
        type: 'cashout',
        amount: -actualReversal,
        description: `Refund reversed: "${booking.listing_title}" — neighbor disputed the work`,
        occurred_at: new Date().toISOString(),
      });
      if (newBalance === 0 && currentBalance < teenGets) {
        console.error(
          `reverseReleasedPayment: WALLET CLAMPED AT ZERO for teen ${booking.teen_user_id}. ` +
          `Shortfall: $${(teenGets - currentBalance).toFixed(2)}. Booking ${booking.id}. ` +
          `Manual resolution required.`
        );
      }
    }
  }
  return true;
}

// Backward-compatible wrapper. Routes to the correct function based on
// payment_status. Throws on any booking with no captured payment — never
// silently returns false.
export async function refundHeldPayment(base44, booking) {
  if (booking.payment_status === 'released') {
    return await reverseReleasedPayment(base44, booking);
  }
  return await refundEscrowPayment(base44, booking);
}