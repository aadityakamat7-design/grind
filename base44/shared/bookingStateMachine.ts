// Single source of truth for booking lifecycle transitions.
// Every transition validates its precondition and rejects loudly if the
// booking is not in the expected state. No booking.status or
// booking.payment_status write should happen outside these functions
// (or the handshake functions in jobHandshake.ts for the completion flow).

// ── STATUS (workflow state) ──
// payment_pending         — buyer opened Stripe Checkout, no money moved
// pending_parent_approval — payment held, waiting for parent (minor only)
// confirmed               — parent approved (or 18+ with no parent)
// in_progress             — job started (both teen + buyer confirmed start)
// completed               — job done (both confirmed finish, funds released)
// cancelled               — cancelled (no refund needed, or refund already done)
// denied                  — parent denied a pending_parent_approval booking
// disputed                — buyer reported the work wasn't done
// abandoned               — auto-expired from payment_pending after 30 min

// ── PAYMENT_STATUS (money state) ──
// unpaid         — no money captured
// held           — money captured and held in escrow (ONLY via verified webhook)
// releasing      — money being transferred to teen (transient lock)
// released       — money in teen's wallet
// refunded       — money returned to buyer
// payment_failed — charge declined

// HARD INVARIANT: payment_status can only become 'held' via confirmPaymentHeld
// (escrow at booking) or recordBuyerStartAfterPayment (start payment), both
// called exclusively from the verified Stripe webhook. No client action,
// admin action, or any other code path may set payment_status to 'held'.

// A refund is only valid when money was actually captured. A booking with
// payment_status 'unpaid' has nothing to refund — attempting a refund on it
// must be rejected loudly (throw), never silently return false.
export function assertRefundable(booking) {
  if (!booking.stripe_payment_intent_id) {
    throw new Error(
      `Refund rejected: booking ${booking.id} has no Stripe payment intent — no payment was ever captured.`
    );
  }
  if (booking.payment_status !== 'held') {
    throw new Error(
      `Refund rejected: booking ${booking.id} has payment_status '${booking.payment_status}' — only 'held' bookings can be refunded.`
    );
  }
}

// The webhook is the ONLY entry point to confirm a held escrow payment.
// Validates that the booking is in payment_pending and transitions it to
// pending_parent_approval (minor) or confirmed (18+). Throws if the booking
// is not in payment_pending — a late payment on an abandoned/cancelled booking
// must never revive it.
export async function confirmPaymentHeld(base44, bookingId, paymentIntentId, isTestMode) {
  const svc = base44.asServiceRole.entities;
  const booking = await svc.Booking.get(bookingId);
  if (!booking) throw new Error(`confirmPaymentHeld: booking ${bookingId} not found`);

  // Idempotent — if already held, skip (duplicate webhook event).
  if (booking.payment_status === 'held') return { booking, alreadyHeld: true };

  // Hard guard: only payment_pending bookings can transition to held.
  if (booking.status !== 'payment_pending') {
    console.error(
      `confirmPaymentHeld: REJECTED — booking ${bookingId} is in status '${booking.status}', not 'payment_pending'. ` +
      `A late payment landed on a non-pending booking. Payment intent: ${paymentIntentId}`
    );
    throw new Error(
      `confirmPaymentHeld: booking ${bookingId} is in status '${booking.status}', not 'payment_pending'. ` +
      `Refusing to confirm payment — the booking may have been abandoned.`
    );
  }

  // Determine the next workflow state: minor → parent approval, 18+ → confirmed.
  const nextStatus = booking.parent_user_id ? 'pending_parent_approval' : 'confirmed';

  await svc.Booking.update(bookingId, {
    payment_status: 'held',
    status: nextStatus,
    stripe_payment_intent_id: paymentIntentId,
    is_test_mode: isTestMode,
  });

  return { booking: { ...booking, payment_status: 'held', status: nextStatus }, alreadyHeld: false };
}