import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import Stripe from 'npm:stripe@17.5.0';
import { releaseBookingPayment } from '../../shared/releaseBooking.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookingId, tipAmount } = await req.json();
    if (!bookingId) return Response.json({ error: 'bookingId required' }, { status: 400 });

    const booking = await base44.asServiceRole.entities.Booking.get(bookingId);
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });
    if (booking.buyer_user_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (booking.status !== 'completed' || booking.payment_status !== 'held') {
      return Response.json({ error: 'Payment cannot be released for this booking' }, { status: 400 });
    }

    const tip = Math.max(0, Math.round((Number(tipAmount) || 0) * 100) / 100);

    // Tips must be charged through Stripe before any wallet credit — the release
    // itself happens in the webhook once the tip payment succeeds.
    if (tip > 0) {
      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
      const origin = req.headers.get('origin') || 'https://grind-local-link.base44.app';
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Tip for ${booking.teen_display_name || 'your local teen'}`,
                description: `Tip for "${booking.listing_title}" — 100% goes to the teen.`,
              },
              unit_amount: Math.round(tip * 100),
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/bookings/${booking.id}?paid=1`,
        cancel_url: `${origin}/bookings/${booking.id}`,
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          tip_booking_id: booking.id,
          tip_amount: String(tip),
        },
      });
      return Response.json({ url: session.url });
    }

    const teenGets = await releaseBookingPayment(base44, booking, 0);
    return Response.json({ success: true, teenGets });
  } catch (error) {
    console.error('releasePayment error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});