import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { getStripe } from '../../shared/stripeEnv.ts';
import { getSafeOrigin } from '../../shared/safeOrigin.ts';

// Charges the buyer's job-posting fee upfront and holds it in escrow, before
// any teen can accept the job.
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
    if (job.payment_status !== 'unpaid') return Response.json({ error: 'Job already paid' }, { status: 400 });

    const gross = Math.round(Number(job.price) * 100) / 100;
    const platformFee = Math.round(gross * 0.15 * 100) / 100;
    const netAmount = Math.round((gross - platformFee) * 100) / 100;
    const cents = Math.round(gross * 100);

    await base44.asServiceRole.entities.JobPost.update(job.id, {
      charge_amount: gross,
      platform_fee: platformFee,
      net_amount: netAmount,
    });

    if (cents <= 0) {
      await base44.asServiceRole.entities.JobPost.update(job.id, { payment_status: 'held' });
      return Response.json({ paid: true });
    }

    const stripe = getStripe();
    const origin = getSafeOrigin(req);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: job.title || 'Kickstart job post', description: 'Held in escrow until a teen accepts and completes the job.' },
            unit_amount: cents,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/jobs?paid=1`,
      cancel_url: `${origin}/jobs`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        job_post_id: job.id,
      },
      payment_intent_data: { metadata: { job_post_id: job.id } },
    });

    await base44.asServiceRole.entities.JobPost.update(job.id, { stripe_session_id: session.id });
    return Response.json({ url: session.url });
  } catch (error) {
    console.error('createJobCheckout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});