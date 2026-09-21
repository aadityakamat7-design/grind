import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getStripeContext } from '../../shared/stripeEnv.ts';

// Scheduled sweep: cancels booking records the buyer never finished paying for.
// A booking is created in `pending_parent_approval` + `payment_status: 'unpaid'`
// the moment the buyer opens Stripe Checkout. If they abandon checkout, that
// record would sit forever as an orphaned "pending" booking. This cancels any
// such record older than 30 minutes and expires its Stripe session so a late
// payment can't revive it. Called by the CleanupAbandonedBookings workflow.
Deno.serve(async (req) => {
  try {
    const body = await req.json();
    // Auth: the platform injects _workflowSecret = WORKFLOW_SECRET on workflow calls.
    const WF_SECRET = Deno.env.get('WORKFLOW_SECRET');
    if (!WF_SECRET || body?._workflowSecret !== WF_SECRET) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole.entities;

    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    // Fetch pending+unpaid bookings; age is checked client-side since the schema
    // has no compound filter for created_date < cutoff.
    const stale = await svc.Booking.filter(
      { status: 'pending_parent_approval', payment_status: 'unpaid' },
      'created_date',
      200,
    );
    const abandoned = stale.filter((b) => new Date(b.created_date) < cutoff);

    const { stripe } = await getStripeContext(base44);
    let cancelled = 0;
    for (const b of abandoned) {
      // Expire the Stripe Checkout session so a stray late payment can't land
      // on a booking we're about to cancel.
      if (b.stripe_session_id) {
        try {
          await stripe.checkout.sessions.expire(b.stripe_session_id);
        } catch (err) {
          // Session may already be expired/paid — non-fatal, continue the cleanup.
          console.error(`cleanupAbandonedBookings: expire session ${b.stripe_session_id}:`, err.message);
        }
      }
      await svc.Booking.update(b.id, { status: 'cancelled' });
      // Remove the placeholder message thread so it doesn't clutter either inbox.
      const threads = await svc.MessageThread.filter({ booking_id: b.id });
      for (const t of threads) {
        await svc.MessageThread.delete(t.id);
      }
      cancelled++;
    }

    return Response.json({ cancelled, checked: stale.length });
  } catch (error) {
    console.error('cleanupAbandonedBookings error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});