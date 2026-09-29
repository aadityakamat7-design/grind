import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import {
  requireAdmin, readReason, writeAdminAudit, bookingSnapshot, notifyBookingParties, notifyUser, money,
} from '../../shared/adminAction.ts';
import { issueAdminRefund, releaseWithLock, refundableCeiling, round2 } from '../../shared/adminMoney.ts';

// Admin resolves a disputed or stuck booking: release in full to the teen,
// split it (refund part, release the rest), refund the neighbor in full, or
// record a no-show by either side. The booking's real payment state gates which
// of these can actually run, so money is never invented and never stranded.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44, req);
    if (auth.error) return auth.error;
    const { user, ip } = auth;

    const body = await req.json();
    const { bookingId } = body;
    const resolution = body?.resolution; // release | split | refund | no_show_teen | no_show_buyer
    const VALID = ['release', 'split', 'refund', 'no_show_teen', 'no_show_buyer'];
    if (!bookingId) return Response.json({ error: 'bookingId required' }, { status: 400 });
    if (!VALID.includes(resolution)) {
      return Response.json({ error: `resolution must be one of ${VALID.join(', ')}` }, { status: 400 });
    }
    const reason = readReason(body);
    if (reason.error) return Response.json({ error: reason.error }, { status: 400 });

    const svc = base44.asServiceRole.entities;
    const booking = await svc.Booking.get(bookingId).catch(() => null);
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

    const RESOLVABLE = ['disputed', 'in_progress', 'confirmed', 'pending_parent_approval'];
    if (!RESOLVABLE.includes(booking.status)) {
      return Response.json(
        { error: `A ${String(booking.status).replace(/_/g, ' ')} booking can't be resolved — there is nothing left to decide.` },
        { status: 400 },
      );
    }
    if (booking.payout_hold) {
      return Response.json(
        { error: 'This booking\u2019s payout is on hold. Release the hold first, then resolve it.' },
        { status: 400 },
      );
    }

    const before = bookingSnapshot(booking);
    const captured = booking.payment_status === 'held';
    const paidOut = booking.payment_status === 'released' || booking.payment_status === 'releasing';

    // Money must actually be held for any outcome that moves it.
    const needsMoney = true;
    if (needsMoney && !captured) {
      return Response.json(
        {
          error: paidOut
            ? 'The payment on this booking was already released — Stripe can\u2019t reverse it automatically. Flag it for a manual transfer reversal instead.'
            : 'No payment was captured on this booking, so there is nothing to release or refund.',
        },
        { status: 400 },
      );
    }

    let refunded = 0;
    let refundId = '';
    let teenGets = 0;
    let finalStatus = booking.status;
    let resolutionLabel = '';

    if (resolution === 'release' || resolution === 'no_show_buyer') {
      const res = await releaseWithLock(base44, booking, Number(booking.tip_amount) || 0);
      teenGets = res.teenGets;
      finalStatus = 'completed';
      resolutionLabel = 'released';
      await svc.Booking.update(booking.id, {
        status: 'completed',
        buyer_finished_at: new Date().toISOString(),
        admin_resolution: resolution === 'release' ? 'released' : 'no_show_buyer',
        payout_review_reason: '',
        admin_action_at: new Date().toISOString(),
      });
    } else if (resolution === 'no_show_teen' || resolution === 'refund') {
      const res = await issueAdminRefund(base44, booking, null);
      refunded = res.amount;
      refundId = res.refundId;
      finalStatus = 'refunded';
      resolutionLabel = 'refunded';
      await svc.Booking.update(booking.id, {
        status: 'refunded',
        payment_status: 'refunded',
        admin_resolution: resolution === 'no_show_teen' ? 'no_show_teen' : 'refunded',
        admin_refund_amount: round2(round2(booking.admin_refund_amount) + refunded),
        payout_review_reason: '',
        admin_action_at: new Date().toISOString(),
      });
    } else {
      // split — refund the agreed amount, release the remainder to the teen.
      const amount = round2(body?.refundAmount);
      if (!(amount > 0)) {
        return Response.json({ error: 'Enter the amount to refund to the neighbor.' }, { status: 400 });
      }
      const ceiling = refundableCeiling(booking);
      if (amount >= ceiling) {
        return Response.json(
          { error: `A split must refund less than the full ${money(ceiling)} — use "refund the neighbor in full" instead.` },
          { status: 400 },
        );
      }
      const res = await issueAdminRefund(base44, booking, amount);
      refunded = res.amount;
      refundId = res.refundId;

      const retained = round2(round2(booking.price_total) - refunded);
      const rel = await releaseWithLock(base44, booking, 0, retained);
      teenGets = rel.teenGets;
      finalStatus = 'completed';
      resolutionLabel = 'split';

      await svc.Booking.update(booking.id, {
        price_total: retained,
        status: 'completed',
        admin_resolution: 'split',
        admin_refund_amount: round2(round2(booking.admin_refund_amount) + refunded),
        payout_review_reason: '',
        admin_action_at: new Date().toISOString(),
      });
    }

    // Re-read so the audit trail records the booking's real end state.
    const settled = await svc.Booking.get(booking.id);

    const outcomeLine = refunded > 0 && teenGets > 0
      ? `${money(refunded)} was refunded to the neighbor and the rest was released to the teen.`
      : refunded > 0
        ? `${money(refunded)} was refunded to the neighbor.`
        : `The payment was released to the teen.`;

    await notifyBookingParties(base44, booking, {
      type: booking.buyer_user_id ? 'booking' : 'booking',
      title: 'Blockwork support resolved this booking',
      body: `"${booking.listing_title}" — our team reviewed it and ${outcomeLine}`,
      link: `/bookings/${booking.id}`,
    });

    await writeAdminAudit(base44, {
      admin: user,
      action: 'resolve_booking',
      actionGroup: 'booking',
      targetType: 'Booking',
      targetId: booking.id,
      bookingId: booking.id,
      subjectUserId: booking.buyer_user_id,
      reasonCode: reason.reasonCode,
      reasonNote: reason.reasonNote,
      before,
      after: { ...bookingSnapshot(settled), refunded, teen_got: teenGets },
      refundAmount: refunded,
      stripeRefs: { payment_intent_id: booking.stripe_payment_intent_id || '', refund_id: refundId },
      summary: `Resolved "${booking.listing_title}" as ${resolutionLabel}. ${outcomeLine}`,
      ip,
    });

    return Response.json({
      success: true,
      resolution: resolutionLabel,
      status: finalStatus,
      refunded,
      teen_got: teenGets,
    });
  } catch (error) {
    console.error('adminResolveBooking error:', error.message);
    return Response.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
});