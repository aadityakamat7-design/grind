import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { getStripeForApp } from '../../shared/stripeEnv.ts';

// Cancels an open job post. The neighbor paid the full amount upfront when
// posting, so cancellation refunds the held escrow to their original card.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { jobId } = await req.json();
    if (!jobId) return Response.json({ error: 'jobId required' }, { status: 400 });

    const job = await base44.asServiceRole.entities.JobPost.get(jobId);
    if (!job) return Response.json({ error: 'Job not found' }, { status: 404 });
    if (job.buyer_user_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (job.status !== 'open') return Response.json({ error: 'Job can no longer be cancelled' }, { status: 400 });

    // Refund the held upfront payment, then close the post.
    if (job.payment_status === 'held' && job.stripe_payment_intent_id) {
      try {
        const stripe = await getStripeForApp(base44);
        await stripe.refunds.create({ payment_intent: job.stripe_payment_intent_id });
        await base44.asServiceRole.entities.JobPost.update(job.id, { status: 'cancelled', payment_status: 'refunded' });
      } catch (err) {
        console.error('cancelJobPost refund error:', err.message);
        await base44.asServiceRole.entities.JobPost.update(job.id, { status: 'cancelled' });
      }
    } else {
      await base44.asServiceRole.entities.JobPost.update(job.id, { status: 'cancelled' });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('cancelJobPost error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});