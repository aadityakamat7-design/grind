import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { attemptBookingPayout } from '../../shared/payoutTransfer.ts';

// Retries or approves a booking payout:
// - Admins approve payouts stuck in pending_review (manual safety review).
// - The booking's parent can retry an awaiting_bank payout after connecting a bank
//   (the review safeguard still applies to them).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookingId } = await req.json();
    if (!bookingId) return Response.json({ error: 'bookingId required' }, { status: 400 });

    const booking = await base44.asServiceRole.entities.Booking.get(bookingId).catch(() => null);
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });
    if (booking.payment_status !== 'released') {
      return Response.json({ error: 'Payment has not been released for this booking' }, { status: 400 });
    }
    if (booking.payout_status === 'transferred') {
      return Response.json({ error: 'Payout was already transferred' }, { status: 400 });
    }

    const isAdmin = user.role === 'admin';
    const isParent = booking.parent_user_id === user.id;

    if (isAdmin) {
      const result = await attemptBookingPayout(base44, booking, { skipReview: true });
      return Response.json(result);
    }
    if (isParent && booking.payout_status === 'awaiting_bank') {
      const result = await attemptBookingPayout(base44, booking);
      return Response.json(result);
    }
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error) {
    console.error('processPayout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});