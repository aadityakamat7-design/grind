import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { refundHeldPayment } from '../../shared/stripeRefund.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookingId, approve } = await req.json();
    if (!bookingId) return Response.json({ error: 'bookingId required' }, { status: 400 });

    const booking = await base44.asServiceRole.entities.Booking.get(bookingId);
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });
    if (booking.parent_user_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (booking.status !== 'pending_parent_approval') {
      return Response.json({ error: 'Booking is not awaiting approval' }, { status: 400 });
    }

    if (approve) {
      // Parents can approve bookings freely — identity verification and bank
      // (Stripe Connect) setup are NOT required to approve. The teen can do
      // the job and earn money, but the earnings are locked in the Blockwork
      // Wallet and cannot be withdrawn until the parent completes payout
      // setup (walletCashOut and attemptBookingPayout both enforce this).
      await base44.asServiceRole.entities.Booking.update(booking.id, { status: 'confirmed' });
      const threads = await base44.asServiceRole.entities.MessageThread.filter({ booking_id: booking.id });
      if (threads[0]) {
        await base44.asServiceRole.entities.MessageThread.update(threads[0].id, { is_confirmed: true });
      }
      await base44.asServiceRole.entities.Notification.create({
        user_id: booking.teen_user_id,
        type: 'approval',
        title: 'Booking approved! 🎉',
        body: `Your parent approved "${booking.listing_title}". You can now start the job.`,
        link: `/bookings/${booking.id}`,
        read: false,
      });
      await base44.asServiceRole.entities.Notification.create({
        user_id: booking.buyer_user_id,
        type: 'booking',
        title: 'Booking confirmed ✅',
        body: `The parent approved "${booking.listing_title}". You can now start the job.`,
        link: `/bookings/${booking.id}`,
        read: false,
      });
    } else {
      // Refund the escrowed Stripe payment before marking the booking denied
      const refunded = await refundHeldPayment(base44, booking);
      await base44.asServiceRole.entities.Booking.update(booking.id, {
        status: 'denied',
        payment_status: refunded ? 'refunded' : booking.payment_status,
      });

      // Re-list the job post so other teens can see and accept it again.
      const deniedJobPosts = await base44.asServiceRole.entities.JobPost.filter({ booking_id: booking.id });
      if (deniedJobPosts[0] && deniedJobPosts[0].status === 'assigned') {
        await base44.asServiceRole.entities.JobPost.update(deniedJobPosts[0].id, {
          status: 'open',
          assigned_teen_user_id: '',
          assigned_teen_name: '',
          booking_id: '',
        });
      }

      await base44.asServiceRole.entities.Notification.create({
        user_id: booking.teen_user_id,
        type: 'approval',
        title: 'Booking denied',
        body: `Your parent denied the booking for "${booking.listing_title}".`,
        link: `/bookings/${booking.id}`,
        read: false,
      });
      await base44.asServiceRole.entities.Notification.create({
        user_id: booking.buyer_user_id,
        type: 'booking',
        title: 'Booking denied',
        body: `The parent denied your booking for "${booking.listing_title}".${refunded ? ' Your payment will be refunded.' : ''}`,
        link: `/bookings/${booking.id}`,
        read: false,
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('decideBooking error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});