// Every admin money move goes through this module so the booking state
// machine's invariants hold no matter which action is used:
//   • a refund can only happen when a real payment was captured ('held')
//   • a refund can never exceed what the neighbor was actually charged
//   • money is never left stranded in escrow after a cancellation
import { assertRefundable } from './bookingStateMachine.ts';
import { getStripeForApp } from './stripeEnv.ts';
import { releaseBookingPayment } from './releaseBooking.ts';

export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// Most that may still be refunded: what was charged, less anything support has
// already refunded. Never more than was captured — this is what stops a refund
// from creating a negative balance.
export function refundableCeiling(booking) {
  const charged = round2(booking.charge_amount ?? booking.price_total);
  const already = round2(booking.admin_refund_amount);
  return Math.max(0, round2(charged - already));
}

// Issues a refund against the booking's real PaymentIntent. Pass amount=null
// for a full refund. Throws (never silently succeeds) when the booking has no
// captured payment, or when the amount exceeds the refundable ceiling.
export async function issueAdminRefund(base44, booking, amount) {
  assertRefundable(booking); // throws unless payment_status === 'held' with a real intent

  const intentId = booking.stripe_payment_intent_id;
  const ceiling = refundableCeiling(booking);

  if (amount == null) {
    // Full refund — sub-minimum charges have a synthetic intent and no real
    // Stripe charge, so there is nothing to send to Stripe.
    if (intentId?.startsWith('submin_')) return { refundId: '', amount: ceiling };
    const stripe = await getStripeForApp(base44);
    const refund = await stripe.refunds.create({ payment_intent: intentId });
    return { refundId: refund.id, amount: ceiling };
  }

  const amt = round2(amount);
  if (!(amt > 0)) throw new Error('Refund amount must be greater than zero.');
  if (amt > ceiling) {
    throw new Error(`A refund of $${amt.toFixed(2)} is more than the $${ceiling.toFixed(2)} still refundable on this booking.`);
  }
  if (intentId?.startsWith('submin_')) return { refundId: '', amount: amt };

  const stripe = await getStripeForApp(base44);
  const refund = await stripe.refunds.create({
    payment_intent: intentId,
    amount: Math.round(amt * 100),
  });
  return { refundId: refund.id, amount: amt };
}

// Releases the held payment to the teen's side using the same atomic lock the
// normal completion path uses, so a concurrent payout pass can never double-pay.
// `priceOverride` lets a split settle on the retained amount without mutating
// the booking's stored price before the release math runs.
export async function releaseWithLock(base44, booking, tip, priceOverride) {
  const svc = base44.asServiceRole.entities;
  const source = priceOverride == null ? booking : { ...booking, price_total: round2(priceOverride) };

  const lockToken = `lock_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await svc.Booking.updateMany(
    { id: booking.id, payment_status: 'held' },
    { $set: { payment_status: 'releasing', stripe_transfer_id: lockToken } },
  );
  const fresh = await svc.Booking.get(booking.id);
  if (fresh.payment_status !== 'releasing' || fresh.stripe_transfer_id !== lockToken) {
    throw new Error('This booking payment is no longer available to release — refresh and check its current state.');
  }
  try {
    const paid = await releaseBookingPayment(base44, source, tip);
    return { released: true, teenGets: paid };
  } catch (err) {
    // Roll the lock back so the normal flow can retry.
    await svc.Booking.update(booking.id, { payment_status: 'held', stripe_transfer_id: '' });
    throw err;
  }
}