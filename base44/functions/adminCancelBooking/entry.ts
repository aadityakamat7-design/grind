import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import {
  requireAdmin, readReason, writeAdminAudit, bookingSnapshot, notifyBookingParties, money,
} from '../../shared/adminAction.ts';
import { issueAdminRefund, refundableCeiling, releaseWithLock, round2 } from '../../shared/adminMoney.ts';

// Admin cancels a booking, choosing how money is handled. The options that are
// actually valid depend on the booking's real payment state — the server
// re-checks that, so a stale admin screen can't force an impossible refund.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44, req);
    if (auth.error) return auth.error;
    const { user, ip } = auth;

    const body = await req.json();
    const { bookingId } = body;
    const moneyMode = body?.money; // 'none' | 'full' | 'partial'
    if (!bookingId) return Response.json({ error: 'bookingId required' }, { status: 400 });
    if (!['none', 'full', 'partial'].includes(moneyMode)) {
      return Response.json({ error: 'money must be one of none, full, partial' }, { status: 400 });
    }
    const reason = readReason(body);
    if (reason.error) return Response.json({ error: reason.error }, { status: 400 });

    const svc = base44.asServiceRole.entities;
    const booking = await svc.Booking.get(bookingId).catch(() => null);
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

    const TERMINAL = ['cancelled', 'cancelled_by_admin', 'refunded', 'abandoned', 'denied'];
    if (TERMINAL.includes(booking.status)) {
      return Response.json(
        { error: `This booking is already ${String(booking.status).replace(/_/g, ' ')} — there is nothing left to cancel.` },
        { status: 400 },
      );
    }
    if (booking.status === 'completed' && booking.payment_status === 'released' && moneyMode === 'none') {
      // Falls through to the released branch below — cancellation of the record
      // only, with the payout flagged for manual review.
    }
    if (booking.payout_hold) {
      return Response.json(
        { error: 'This booking\u2019s payout is on hold. Release the hold first, then cancel.' },
        { status: 400 },
      );
    }

    const before = bookingSnapshot(booking);
    const captured = booking.payment_status === 'held';
    const alreadyPaidOut = booking.payment_status === 'released' || booking.payment_status === 'releasing';

    // Only offer money options that match reality.
    if (!captured && !alreadyPaidOut && moneyMode !== 'none') {
      return Response.json(
        { error: 'No payment was captured on this booking, so there is nothing to refund.' },
        { status: 400 },
      );
    }
    if (alreadyPaidOut && moneyMode !== 'none') {
      return Response.json(
        {
          error: 'The payment on this booking was already released to the teen\u2019s side, so Stripe cannot refund it automatically. Cancel the record only, then flag it for a manual transfer reversal.',
        },
        { status: 400 },
      );
    }

    let refunded = 0;
    let refundId = '';
    let releasedToTeen = false;
    let manualReversalNeeded = false;

    if (moneyMode === 'full') {
      const res = await issueAdminRefund(base44, booking, null);
      refundId = res.refundId;
      refunded = res.amount;
    } else if (moneyMode === 'partial') {
      const amount = round2(body?.refundAmount);
      if (!(amount > 0)) {
        return Response.json({ error: 'Enter a refund amount greater than zero.' }, { status: 400 });
      }
      const ceiling = refundableCeiling(booking);
      if (amount > ceiling) {
        return Response.json(
          { error: `You can refund at most ${money(ceiling)} on this booking.` },
          { status: 400 },
        );
      }
      const res = await issueAdminRefund(base44, booking, amount);
      refundId = res.refundId;
      refunded = res.amount;

      // The neighbor keeps the rest of the work's value, so the un-refunded
      // remainder is released to the teen rather than stranded in escrow.
      const retained = round2(round2(booking.price_total) - refunded);
      if (retained > 0) {
        await releaseWithLock(base44, booking, 0, retained);
        releasedToTeen = true;
      }
    } else if (captured) {
      // No refund chosen: the money stays with the teen, so release it instead
      // of leaving it held in escrow forever.
      await releaseWithLock(base44, booking, 0);
      releasedToTeen = true;
    }

    // Final state. A full refund is "refunded"; everything else is a support
    // cancellation. Money that already left the platform is flagged for review.
    const finalStatus = moneyMode === 'full' ? 'refunded' : 'cancelled_by_admin';
    const patch = {
      status: finalStatus,
      admin_resolution: refunded > 0 ? 'refunded' : 'none',
      admin_refund_amount: round2(round2(booking.admin_refund_amount) + refunded),
      admin_action_at: new Date().toISOString(),
    };
    if (moneyMode === 'full') patch.payment_status = 'refunded';
    if (alreadyPaidOut) {
      manualReversalNeeded = true;
      patch.payout_status = 'pending_review';
      patch.payout_review_reason =
        'Support cancelled a booking whose payment had already been released — a manual Stripe transfer reversal is needed.';
    }
    await svc.Booking.update(booking.id, patch);

    // Put an assigned job post back on the board so the neighbor can find
    // someone else (same behaviour as a normal cancellation).
    const posts = await svc.JobPost.filter({ booking_id: booking.id });
    if (posts[0] && posts[0].status === 'assigned') {
      await svc.JobPost.update(posts[0].id, {
        status: 'open',
        assigned_teen_user_id: '',
        assigned_teen_name: '',
        booking_id: '',
      });
    }

    const moneyLine = refunded > 0
      ? `${money(refunded)} has been refunded to the neighbor.`
      : releasedToTeen
        ? 'The held payment was released to the teen.'
        : 'No payment was involved.';

    await notifyBookingParties(base44, booking, {
      type: 'booking',
      title: 'Booking cancelled by Blockwork support',
      body: `"${booking.listing_title}" was cancelled by Blockwork support. ${moneyLine}`,
      link: `/bookings/${booking.id}`,
    });

    await writeAdminAudit(base44, {
      admin: user,
      action: 'cancel_booking',
      actionGroup: 'booking',
      targetType: 'Booking',
      targetId: booking.id,
      bookingId: booking.id,
      subjectUserId: booking.buyer_user_id,
      reasonCode: reason.reasonCode,
      reasonNote: reason.reasonNote,
      before,
      after: { ...bookingSnapshot({ ...booking, ...patch }), refunded, released_to_teen: releasedToTeen },
      refundAmount: refunded,
      stripeRefs: { payment_intent_id: booking.stripe_payment_intent_id || '', refund_id: refundId },
      summary: `Cancelled "${booking.listing_title}" — ${moneyMode} money handling. ${moneyLine}`,
      ip,
    });

    return Response.json({
      success: true,
      status: finalStatus,
      refunded,
      released_to_teen: releasedToTeen,
      manual_reversal_needed: manualReversalNeeded,
    });
  } catch (error) {
    console.error('adminCancelBooking error:', error.message);
    return Response.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
});