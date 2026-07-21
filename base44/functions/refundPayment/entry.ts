import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import Stripe from 'npm:stripe@17.5.0';

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
    if (!['pending_parent_approval', 'confirmed'].includes(booking.status)) {
      return Response.json({ error: 'Booking can no longer be cancelled' }, { status: 400 });
    }

    if (booking.payment_status === 'held' && booking.stripe_payment_intent_id) {
      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
      await stripe.refunds.create({ payment_intent: booking.stripe_payment_intent_id });
    }

    await base44.asServiceRole.entities.Booking.update(booking.id, {
      status: 'cancelled',
      payment_status: booking.payment_status === 'unpaid' ? 'unpaid' : 'refunded',
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('refundPayment error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});