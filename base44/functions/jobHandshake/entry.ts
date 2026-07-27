import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { getStripe } from '../../shared/stripeEnv.ts';
import { getSafeOrigin } from '../../shared/safeOrigin.ts';
import { roleFor, recordStart, recordFinish } from '../../shared/jobHandshake.ts';

// The single entry point for the two-sided start/finish handshake.
// Only the teen and the neighbor on the booking can call it, and the booking
// only advances when BOTH have confirmed the same step.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookingId, action, tipAmount } = await req.json();
    if (!bookingId || !['start', 'finish'].includes(action)) {
      return Response.json({ error: 'bookingId and a valid action are required' }, { status: 400 });
    }

    let booking;
    try {
      booking = await base44.asServiceRole.entities.Booking.get(bookingId);
    } catch {
      booking = null;
    }
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

    const role = roleFor(booking, user.id);
    if (!role) return Response.json({ error: 'Only the teen and the neighbor on this job can do that.' }, { status: 403 });

    if (action === 'start') {
      if (booking.status !== 'confirmed') {
        return Response.json({ error: 'This job must be approved by the parent before it can start.' }, { status: 400 });
      }
      if (booking.payment_status !== 'held') {
        return Response.json({ error: 'Payment must be held in escrow before the job can start.' }, { status: 400 });
      }
      const result = await recordStart(base44, booking, role);
      return Response.json(result);
    }

    // action === 'finish'
    if (booking.status !== 'in_progress') {
      return Response.json({ error: 'The job has to be in progress before it can be finished.' }, { status: 400 });
    }

    const tip = role === 'buyer' ? Math.max(0, Math.round((Number(tipAmount) || 0) * 100) / 100) : 0;

    // A tip is real money — it must clear Stripe before we record the buyer's
    // finish. The webhook records the finish and releases once payment succeeds.
    if (tip > 0 && !booking.buyer_finished_at) {
      const stripe = getStripe();
      const origin = getSafeOrigin(req);
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

    const result = await recordFinish(base44, booking, role, 0);
    return Response.json(result);
  } catch (error) {
    console.error('jobHandshake error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});