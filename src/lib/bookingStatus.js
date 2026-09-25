// Computes a single unified status badge value from a booking's status and
// payment_status fields. This ensures every screen shows exactly one badge
// that reflects the real state — never two contradictory badges at once.
//
// The booking state machine (base44/shared/bookingStateMachine.ts) is the
// source of truth: payment_status can only become 'held' via the verified
// Stripe webhook, which also advances status to pending_parent_approval or
// confirmed. So if payment_status is NOT 'held' (or beyond), no payment was
// captured — and the badge must never imply money is in escrow.

export function computeBookingBadge(booking) {
  if (!booking) return null;
  const { status, payment_status } = booking;

  // Payment failed — Stripe sent payment_intent.payment_failed (declined card)
  if (status === "payment_pending" && payment_status === "payment_failed") {
    return "payment_failed";
  }

  // Awaiting payment — buyer opened checkout but hasn't paid
  if (status === "payment_pending") return "awaiting_payment";

  // Paid, waiting for parent approval — payment confirmed held by webhook
  if (status === "pending_parent_approval") {
    if (payment_status === "held") return "paid_awaiting_approval";
    // Edge case: status advanced but webhook hasn't confirmed yet
    return "awaiting_payment";
  }

  if (status === "confirmed") return "confirmed";
  if (status === "in_progress") return "in_progress";
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  if (status === "denied") return "denied";
  if (status === "disputed") return "disputed";
  if (status === "abandoned") return "abandoned";

  // Refunded override (payment_status can be refunded on cancelled/denied)
  if (payment_status === "refunded") return "refunded";

  return status;
}