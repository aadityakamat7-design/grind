import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { attemptBookingPayout } from '../../shared/payoutTransfer.ts';
import { checkRateLimit, recordSuccess, getClientIp } from '../../shared/rateLimiter.ts';
import { writeAuditLog } from '../../shared/auditLog.ts';

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

    // Rate limit payout requests: max 5 per 10 minutes per IP and per user.
    // Prevents rapid-fire payout attempts that could probe for booking IDs
    // or try to trigger multiple transfers.
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(ip, user.id);
    if (!rateCheck.allowed) {
      return Response.json({ error: 'Too many requests. Please wait a few minutes before trying again.' }, { status: 429 });
    }
    recordSuccess(ip, user.id);

    const booking = await base44.asServiceRole.entities.Booking.get(bookingId).catch(() => null);
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });
    if (booking.payment_status !== 'released') {
      return Response.json({ error: 'Payment has not been released for this booking' }, { status: 400 });
    }
    if (booking.payout_status === 'transferred') {
      return Response.json({ error: 'Payout was already transferred' }, { status: 400 });
    }

    const isAdmin = user.app_role === 'admin';
    const isParent = booking.parent_user_id === user.id;
    const isTeen = booking.teen_user_id === user.id;

    // Manual withdrawal: parents and independent teens can withdraw once the
    // 7-day settlement period has elapsed (or retry if a bank wasn't connected
    // when they first tried).
    const settlementReady = booking.payout_status === 'awaiting_settlement'
      && booking.payout_eligible_at
      && new Date(booking.payout_eligible_at) <= new Date();
    const holdReady = booking.payout_status === 'pending_new_account_hold'
      && booking.new_account_hold_eligible_at
      && new Date(booking.new_account_hold_eligible_at) <= new Date();
    const canWithdraw = booking.payout_status === 'awaiting_bank' || settlementReady || holdReady;

    if (isAdmin) {
      const result = await attemptBookingPayout(base44, booking, { skipReview: true });
      await writeAuditLog(base44, {
        actor_user_id: user.id, actor_role: 'admin', action: 'payout_transferred',
        category: 'payout', target_type: 'Booking', target_id: booking.id,
        summary: `Admin payout: $${(booking.net_amount || 0).toFixed(2)} for "${booking.listing_title}"`,
        metadata: { net_amount: booking.net_amount, tip_amount: booking.tip_amount, skip_review: true }, ip,
      });
      return Response.json(result);
    }
    if (isParent && canWithdraw) {
      const result = await attemptBookingPayout(base44, booking);
      await writeAuditLog(base44, {
        actor_user_id: user.id, actor_role: 'parent', action: 'payout_transferred',
        category: 'payout', target_type: 'Booking', target_id: booking.id,
        summary: `Parent payout: $${(booking.net_amount || 0).toFixed(2)} for "${booking.listing_title}"`,
        metadata: { net_amount: booking.net_amount, tip_amount: booking.tip_amount }, ip,
      });
      return Response.json(result);
    }
    // Independent 18+ teens withdraw their own payout.
    if (isTeen && !booking.parent_user_id && canWithdraw) {
      const result = await attemptBookingPayout(base44, booking);
      await writeAuditLog(base44, {
        actor_user_id: user.id, actor_role: 'teen', action: 'payout_transferred',
        category: 'payout', target_type: 'Booking', target_id: booking.id,
        summary: `Teen payout: $${(booking.net_amount || 0).toFixed(2)} for "${booking.listing_title}"`,
        metadata: { net_amount: booking.net_amount, tip_amount: booking.tip_amount }, ip,
      });
      return Response.json(result);
    }
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error) {
    console.error('processPayout error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});