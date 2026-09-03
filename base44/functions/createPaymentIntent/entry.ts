import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { getStripeForApp, getPublishableKeyForApp } from '../../shared/stripeEnv.ts';
import { checkRateLimit, recordFailedAttempt, recordSuccess, getClientIp } from '../../shared/rateLimiter.ts';

// Creates a Stripe PaymentIntent for in-app Apple Pay / Google Pay via the
// Payment Request Button. This is an alternative to the Stripe Checkout
// redirect flow — the user pays without leaving the app.
//
// - getKeyOnly: returns just the publishable key (used by the frontend to
//   initialise Stripe.js and check Apple Pay availability before creating a PI).
// - bookingId: creates a PI for a booking's escrow charge (job start payment).
// - jobId: creates a PI for a job post's posting fee.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookingId, jobId, getKeyOnly } = await req.json();

    // Rate limit payment initiation: max 5 per 10 minutes per IP and per user.
    // Prevents rapid-fire PaymentIntent creation (which could be used to probe
    // for valid booking IDs or to flood Stripe with API calls).
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(ip, user.id);
    if (!rateCheck.allowed) {
      return Response.json({ error: 'Too many requests. Please wait a few minutes before trying again.' }, { status: 429 });
    }
    recordSuccess(ip, user.id);

    if (getKeyOnly) {
      return Response.json({ publishable_key: await getPublishableKeyForApp(base44) });
    }

    if (bookingId) {
      const booking = await base44.asServiceRole.entities.Booking.get(bookingId);
      if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });
      if (booking.buyer_user_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
      if (booking.status !== 'confirmed') return Response.json({ error: 'This job must be approved before it can start.' }, { status: 400 });
      if (booking.buyer_started_at) return Response.json({ error: 'Already started' }, { status: 400 });

      const chargeAmount = booking.charge_amount ?? booking.price_total;
      const cents = Math.round(Number(chargeAmount) * 100);
      if (cents <= 0) return Response.json({ error: 'No charge needed' }, { status: 400 });

      const stripe = await getStripeForApp(base44);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: cents,
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          booking_id: booking.id,
          start_payment: '1',
        },
        description: booking.listing_title || 'Blockwork job',
      });

      await base44.asServiceRole.entities.Booking.update(booking.id, {
        stripe_payment_intent_id: paymentIntent.id,
      });

      return Response.json({
        client_secret: paymentIntent.client_secret,
        publishable_key: await getPublishableKeyForApp(base44),
      });
    }

    if (jobId) {
      const job = await base44.asServiceRole.entities.JobPost.get(jobId);
      if (!job) return Response.json({ error: 'Job not found' }, { status: 404 });
      if (job.buyer_user_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
      if (job.payment_status !== 'unpaid') return Response.json({ error: 'Job already paid' }, { status: 400 });

      const gross = Math.round(Number(job.price) * 100) / 100;
      const cents = Math.round(gross * 100);
      if (cents <= 0) return Response.json({ error: 'No charge needed' }, { status: 400 });

      const stripe = await getStripeForApp(base44);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: cents,
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          job_post_id: job.id,
        },
        description: job.title || 'Blockwork job post',
      });

      return Response.json({
        client_secret: paymentIntent.client_secret,
        publishable_key: await getPublishableKeyForApp(base44),
      });
    }

    return Response.json({ error: 'bookingId or jobId required' }, { status: 400 });
  } catch (error) {
    console.error('createPaymentIntent error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});