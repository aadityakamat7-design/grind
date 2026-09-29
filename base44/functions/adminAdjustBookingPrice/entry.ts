import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import {
  requireAdmin, readReason, writeAdminAudit, bookingSnapshot, notifyBookingParties, money,
} from '../../shared/adminAction.ts';
import { issueAdminRefund, refundableCeiling, round2 } from '../../shared/adminMoney.ts';

// Admin lowers a booking's price after payment (never raises it — an increase
// would need a new charge the neighbor agrees to). The difference goes back to
// the neighbor through Stripe, and the teen's payout recalculates from the
// reduced price when the booking is released.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44, req);
    if (auth.error) return auth.error;
    const { user, ip } = auth;

    const body = await req.json();
    const { bookingId } = body;
    if (!bookingId) return Response.json({ error: 'bookingId required' }, { status: 400 });
    const reason = readReason(body);
    if (reason.error) return Response.json({ error: reason.error }, { status: 400 });

    const svc = base44.asServiceRole.entities;
    const booking = await svc.Booking.get(bookingId).catch(() => null);
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

    if (booking.payment_status === 'released') {
      return Response.json(
        { error: 'This booking has already been paid out, so its price can no longer be adjusted.' },
        { status: 400 },
      );
    }
    if (['cancelled', 'cancelled_by_admin', 'refunded', 'abandoned', 'denied'].includes(booking.status)) {
      return Response.json({ error: 'This booking is closed, so its price can no longer be adjusted.' }, { status: 400 });
    }
    if (booking.payout_hold) {
      return Response.json({ error: 'This booking\u2019s payout is on hold. Release the hold first.' }, { status: 400 });
    }

    const current = round2(booking.price_total);
    const next = round2(body?.price);
    if (!(next > 0)) return Response.json({ error: 'Enter the new price.' }, { status: 400 });
    if (next >= current) {
      return Response.json(
        { error: `Support can only lower a price. The current price is ${money(current)}.` },
        { status: 400 },
      );
    }
    if (next < 16.9) {
      return Response.json({ error: `The minimum price on Blockwork is ${money(16.9)}.` }, { status: 400 });
    }

    const difference = round2(current - next);
    const before = bookingSnapshot(booking);
    let refunded = 0;
    let refundId = '';

    if (booking.payment_status === 'held') {
      const ceiling = refundableCeiling(booking);
      if (difference > ceiling) {
        return Response.json(
          { error: `The difference (${money(difference)}) is more than the ${money(ceiling)} still refundable on this booking.` },
          { status: 400 },
        );
      }
      const res = await issueAdminRefund(base44, booking, difference);
      refunded = res.amount;
      refundId = res.refundId;
    }

    const patch = {
      price_total: next,
      admin_refund_amount: round2(round2(booking.admin_refund_amount) + refunded),
      admin_action_at: new Date().toISOString(),
    };
    await svc.Booking.update(booking.id, patch);

    await notifyBookingParties(base44, booking, {
      type: 'booking',
      title: 'Blockwork support adjusted this job\u2019s price',
      body: refunded > 0
        ? `"${booking.listing_title}" was reduced from ${money(current)} to ${money(next)}. ${money(refunded)} has been refunded to the neighbor.`
        : `"${booking.listing_title}" was reduced from ${money(current)} to ${money(next)}.`,
      link: `/bookings/${booking.id}`,
    });

    await writeAdminAudit(base44, {
      admin: user,
      action: 'adjust_price',
      actionGroup: 'payment',
      targetType: 'Booking',
      targetId: booking.id,
      bookingId: booking.id,
      subjectUserId: booking.buyer_user_id,
      reasonCode: reason.reasonCode,
      reasonNote: reason.reasonNote,
      before,
      after: bookingSnapshot({ ...booking, ...patch }),
      refundAmount: refunded,
      stripeRefs: { payment_intent_id: booking.stripe_payment_intent_id || '', refund_id: refundId },
      summary: `Lowered "${booking.listing_title}" from ${money(current)} to ${money(next)}${refunded > 0 ? ` and refunded ${money(refunded)}` : ''}.`,
      ip,
    });

    return Response.json({ success: true, price_total: next, refunded });
  } catch (error) {
    console.error('adminAdjustBookingPrice error:', error.message);
    return Response.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
});