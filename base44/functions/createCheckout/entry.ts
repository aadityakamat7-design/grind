import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { getStripeContext } from '../../shared/stripeEnv.ts';
import { getSafeOrigin, safeOriginFromString } from '../../shared/safeOrigin.ts';
import { checkRateLimit, recordSuccess, getClientIp } from '../../shared/rateLimiter.ts';
import { writeAuditLog } from '../../shared/auditLog.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookingId, origin: clientOrigin } = await req.json();
    if (!bookingId) return Response.json({ error: 'bookingId required' }, { status: 400 });

    // Rate limit checkout creation: max 5 per 10 minutes per IP and per user.
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(ip, user.id);
    if (!rateCheck.allowed) {
      return Response.json({ error: 'Too many requests. Please wait a few minutes before trying again.' }, { status: 429 });
    }
    recordSuccess(ip, user.id);

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

    const { stripe, testMode } = await getStripeContext(base44);
    const origin = clientOrigin ? safeOriginFromString(clientOrigin) : getSafeOrigin(req);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // No payment_method_types filter — Stripe Checkout then offers every
      // method enabled on the account, including Apple Pay and Google Pay.
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: booking.listing_title || 'Blockwork booking', description: `Booked with ${booking.teen_display_name || 'a local teen'} — held in escrow until the job is done.` },
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
      payment_intent_data: { metadata: { booking_id: booking.id, base44_app_id: Deno.env.get('BASE44_APP_ID') } },
    });

    await base44.asServiceRole.entities.Booking.update(booking.id, { stripe_session_id: session.id, is_test_mode: testMode });
    await writeAuditLog(base44, {
      actor_user_id: user.id,
      actor_role: user.app_role || 'buyer',
      action: 'checkout_created',
      category: 'payout',
      target_type: 'Booking',
      target_id: booking.id,
      summary: `Checkout session created for $${(cents / 100).toFixed(2)} (${testMode ? 'TEST' : 'LIVE'})`,
      metadata: { amount_cents: cents, test_mode: testMode },
      ip,
    });
    return Response.json({ url: session.url });
  } catch (error) {
    console.error('createCheckout error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});