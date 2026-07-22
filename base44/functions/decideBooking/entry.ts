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

    // NOTE: Identity verification requirement is temporarily disabled while
    // Stripe Identity is being activated on the live account. Re-enable this
    // check once verification is back online.
    // const profiles = await base44.asServiceRole.entities.ParentProfile.filter({ user_id: user.id });
    // if (!profiles[0]?.is_identity_verified) {
    //   return Response.json({ error: 'Identity verification required' }, { status: 403 });
    // }

    if (approve) {
      await base44.asServiceRole.entities.Booking.update(booking.id, { status: 'confirmed' });
      const threads = await base44.asServiceRole.entities.MessageThread.filter({ booking_id: booking.id });
      if (threads[0]) {
        await base44.asServiceRole.entities.MessageThread.update(threads[0].id, { is_confirmed: true });
      }
    } else {
      // Refund the escrowed Stripe payment before marking the booking denied
      const refunded = await refundHeldPayment(booking);
      await base44.asServiceRole.entities.Booking.update(booking.id, {
        status: 'denied',
        payment_status: refunded ? 'refunded' : booking.payment_status,
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('decideBooking error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});