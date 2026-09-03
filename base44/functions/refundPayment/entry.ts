import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { refundHeldPayment } from '../../shared/stripeRefund.ts';
import { notifyOwnerTransaction } from '../../shared/notifyOwnerTransaction.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookingId } = await req.json();
    if (!bookingId) return Response.json({ error: 'bookingId required' }, { status: 400 });

    const booking = await base44.asServiceRole.entities.Booking.get(bookingId);
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

    const isParticipant = [booking.buyer_user_id, booking.teen_user_id, booking.parent_user_id].includes(user.id);
    if (!isParticipant) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (!['pending_parent_approval', 'confirmed', 'in_progress'].includes(booking.status)) {
      return Response.json({ error: 'Booking can no longer be cancelled' }, { status: 400 });
    }

    // Once both sides have started the job, a simple cancel+refund is no longer
    // safe — the teen may have already done work. Flag it for dispute review
    // instead of auto-refunding.
    if (booking.status === 'in_progress' && booking.teen_started_at && booking.buyer_started_at) {
      await base44.asServiceRole.entities.Booking.update(booking.id, {
        dispute_flagged_at: new Date().toISOString(),
        payout_status: 'pending_review',
        payout_review_reason: 'Cancellation requested after both sides started — manual review required',
      });
      await base44.asServiceRole.entities.Notification.create({
        user_id: booking.teen_user_id,
        type: 'booking',
        title: 'Cancellation requested',
        body: `"${booking.listing_title}" — a cancellation was requested after the job started. Our team is reviewing it before any refund is issued.`,
        link: `/bookings/${booking.id}`,
        read: false,
      });
      await base44.asServiceRole.entities.Notification.create({
        user_id: booking.buyer_user_id,
        type: 'booking',
        title: 'Cancellation in review',
        body: `"${booking.listing_title}" — since the job already started, your cancellation is under review. We'll resolve it within 1 business day.`,
        link: `/bookings/${booking.id}`,
        read: false,
      });
      if (booking.parent_user_id) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: booking.parent_user_id,
          type: 'booking',
          title: 'Cancellation needs review',
          body: `"${booking.listing_title}" — a cancellation was requested after the job started. It's under review.`,
          link: `/bookings/${booking.id}`,
          read: false,
        });
      }
      return Response.json({ success: true, disputed: true });
    }

    await refundHeldPayment(base44, booking);

    await notifyOwnerTransaction(base44, {
      type: 'Refund',
      title: `"${booking.listing_title}" — $${Number(booking.charge_amount || booking.price_total || 0).toFixed(2)} returned to buyer`,
      details: `Booking: ${booking.id}\nBuyer: ${booking.buyer_name || booking.buyer_user_id}\nCancelled by: ${user.id}`,
    });

    await base44.asServiceRole.entities.Booking.update(booking.id, {
      status: 'cancelled',
      payment_status: booking.payment_status === 'unpaid' ? 'unpaid' : 'refunded',
    });

    // Re-list the job post so other teens can see and accept it again.
    // Only re-list if the job is still in 'assigned' status (not yet completed).
    const jobPosts = await base44.asServiceRole.entities.JobPost.filter({ booking_id: booking.id });
    if (jobPosts[0] && jobPosts[0].status === 'assigned') {
      await base44.asServiceRole.entities.JobPost.update(jobPosts[0].id, {
        status: 'open',
        assigned_teen_user_id: '',
        assigned_teen_name: '',
        booking_id: '',
      });
    }

    // Notify the other party server-side (client-side notify() can't create
    // notifications for other users due to RLS)
    const otherId = user.id === booking.buyer_user_id ? booking.teen_user_id : booking.buyer_user_id;
    if (otherId) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: otherId,
        type: 'booking',
        title: 'Booking cancelled',
        body: `"${booking.listing_title}" was cancelled and any held payment was refunded.`,
        link: `/bookings/${booking.id}`,
        read: false,
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('refundPayment error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});