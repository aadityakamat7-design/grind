import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { releaseBookingPayment } from '../../shared/releaseBooking.ts';
import { refundHeldPayment } from '../../shared/stripeRefund.ts';

// Admin resolves a disputed booking. The admin reviews the teen's completion
// photos and the neighbor's dispute reason, then decides:
//   release  — the teen did the work → payment released to the parent
//   refund   — the teen didn't do the work → neighbor gets their money back
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.app_role !== 'admin') return Response.json({ error: 'Admins only' }, { status: 403 });

    const { bookingId, decision } = await req.json();
    if (!bookingId || !['release', 'refund'].includes(decision)) {
      return Response.json({ error: 'bookingId and decision (release|refund) required' }, { status: 400 });
    }

    const svc = base44.asServiceRole.entities;
    const booking = await svc.Booking.get(bookingId).catch(() => null);
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });
    if (booking.status !== 'disputed') {
      return Response.json({ error: 'This booking is not disputed.' }, { status: 400 });
    }

    if (decision === 'release') {
      // Mark completed and release escrow to the parent
      await svc.Booking.update(booking.id, {
        status: 'completed',
        buyer_finished_at: new Date().toISOString(),
        admin_resolution: 'released',
        payout_review_reason: '',
      });

      // Atomic lock + release (same pattern as recordBuyerConfirm)
      const lockToken = `lock_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      await svc.Booking.updateMany(
        { id: booking.id, payment_status: 'held' },
        { $set: { payment_status: 'releasing', stripe_transfer_id: lockToken } },
      );
      const fresh = await svc.Booking.get(booking.id);
      if (fresh.payment_status === 'releasing' && fresh.stripe_transfer_id === lockToken) {
        try {
          await releaseBookingPayment(base44, fresh, Number(fresh.tip_amount) || 0);
        } catch (err) {
          await svc.Booking.update(booking.id, { payment_status: 'held', stripe_transfer_id: '' });
          throw err;
        }
      }

      for (const uid of [booking.teen_user_id, booking.parent_user_id].filter(Boolean)) {
        await svc.Notification.create({
          user_id: uid,
          type: 'payment',
          title: 'Payment released after review',
          body: `"${booking.listing_title}" — our team reviewed the dispute and released the payment to your parent's account.`,
          link: `/bookings/${booking.id}`,
        });
      }
      await svc.Notification.create({
        user_id: booking.buyer_user_id,
        type: 'booking',
        title: 'Dispute resolved',
        body: `"${booking.listing_title}" — our team reviewed your report and released the payment to the teen.`,
        link: `/bookings/${booking.id}`,
      });
      return Response.json({ success: true, decision: 'released' });
    }

    // decision === 'refund' — refund the neighbor
    await refundHeldPayment(base44, booking);
    await svc.Booking.update(booking.id, {
      status: 'cancelled',
      payment_status: 'refunded',
      admin_resolution: 'refunded',
      payout_review_reason: '',
    });

    await svc.Notification.create({
      user_id: booking.buyer_user_id,
      type: 'payment',
      title: 'Refund issued',
      body: `"${booking.listing_title}" — our team reviewed your report and refunded your payment.`,
      link: `/bookings/${booking.id}`,
    });
    for (const uid of [booking.teen_user_id, booking.parent_user_id].filter(Boolean)) {
      await svc.Notification.create({
        user_id: uid,
        type: 'booking',
        title: 'Dispute resolved — refund issued',
        body: `"${booking.listing_title}" — our team reviewed the dispute and refunded the neighbor. No payment was released.`,
        link: `/bookings/${booking.id}`,
      });
    }
    return Response.json({ success: true, decision: 'refunded' });
  } catch (error) {
    console.error('resolveDispute error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});