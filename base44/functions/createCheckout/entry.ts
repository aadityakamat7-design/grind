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
    if (booking.buyer_user_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (booking.payment_status !== 'unpaid') return Response.json({ error: 'Booking already paid' }, { status: 400 });

    const chargeAmount = booking.charge_amount ?? booking.price_total;
    const cents = Math.round(Number(chargeAmount) * 100);

    // Referral credit covered the whole booking — no Stripe charge needed
    if (cents <= 0) {
      await base44.asServiceRole.entities.Booking.update(booking.id, { payment_status: 'held' });
      return Response.json({ paid: true });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const origin = req.headers.get('origin') || 'https://grind-local-link.base44.app';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: booking.listing_title || 'Kickstart booking', description: `Booked with ${booking.teen_display_name || 'a local teen'} — held in escrow until the job is done.` },
            unit_amount: cents,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/bookings/${booking.id}?paid=1`,
      cancel_url: `${origin}/bookings/${booking.id}`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        booking_id: booking.id,
      },
      payment_intent_data: { metadata: { booking_id: booking.id } },
    });

    await base44.asServiceRole.entities.Booking.update(booking.id, { stripe_session_id: session.id });
    return Response.json({ url: session.url });
  } catch (error) {
    console.error('createCheckout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});