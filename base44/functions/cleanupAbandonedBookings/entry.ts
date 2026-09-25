import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getStripeContext } from '../../shared/stripeEnv.ts';

// Scheduled sweep: transitions payment_pending bookings the buyer never
// finished paying for to 'abandoned'. A booking is created in
// payment_pending + unpaid the moment the buyer opens Stripe Checkout. If
// they abandon checkout, that record would sit forever as an orphaned
// pending booking. This transitions any such record older than 30 minutes
// to 'abandoned' and expires its Stripe session so a late payment can't
// revive it. Called by the CleanupAbandonedBookings workflow.
//
// No refund logic runs here — abandoned bookings never had a payment
// captured, so there's nothing to refund.
Deno.serve(async (req) => {
  try {
    const body = await req.json();
    // Auth: check both body and headers for the workflow secret.
    const WF_SECRET = Deno.env.get('WORKFLOW_SECRET');
    const _hdrs = Object.fromEntries(req.headers.entries());
    const _hdrMatch = WF_SECRET && Object.values(_hdrs).some(v => v === WF_SECRET);
    if (!WF_SECRET || (body?._workflowSecret !== WF_SECRET && !_hdrMatch)) {
      console.error('Workflow auth failed. Headers:', JSON.stringify(_hdrs));
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole.entities;

    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    // Fetch all payment_pending bookings (both unpaid and payment_failed);
    // age is checked in JS since the schema has no compound filter for
    // created_date < cutoff. A payment_failed booking (declined card) also
    // needs to be swept — otherwise it sits in payment_pending forever.
    const stale = await svc.Booking.filter(
      { status: 'payment_pending' },
      'created_date',
      200,
    );
    const abandoned = stale.filter(
      (b) =>
        (b.payment_status === 'unpaid' || b.payment_status === 'payment_failed') &&
        new Date(b.created_date) < cutoff,
    );

    const { stripe } = await getStripeContext(base44);
    let count = 0;
    for (const b of abandoned) {
      // Expire the Stripe Checkout session so a stray late payment can't land
      // on a booking we're about to abandon.
      if (b.stripe_session_id) {
        try {
          await stripe.checkout.sessions.expire(b.stripe_session_id);
        } catch (err) {
          // Session may already be expired/paid — non-fatal, continue.
          console.error(`cleanupAbandonedBookings: expire session ${b.stripe_session_id}:`, err.message);
        }
      }
      // Mark as abandoned — NOT cancelled. Abandoned bookings never had a
      // payment captured, so no refund logic ever runs on them. This is the
      // auto-expire outcome from payment_pending after 30 minutes.
      await svc.Booking.update(b.id, { status: 'abandoned' });
      // Remove the placeholder message thread so it doesn't clutter either inbox.
      const threads = await svc.MessageThread.filter({ booking_id: b.id });
      for (const t of threads) {
        await svc.MessageThread.delete(t.id);
      }
      count++;
    }

    return Response.json({ abandoned: count, checked: stale.length });
  } catch (error) {
    console.error('cleanupAbandonedBookings error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});