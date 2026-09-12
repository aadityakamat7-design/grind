import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getStripeForApp } from '../../shared/stripeEnv.ts';
import { APP_BASE_URL } from '../../shared/safeOrigin.ts';

// Lets a neighbor resolve their expired job post: refund the held upfront
// payment to their original card, or convert it to platform credit for a
// future post. Only the owning neighbor can resolve, and only while the post
// is expired with payment still held.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { jobId, choice } = await req.json();
    if (!jobId) return Response.json({ error: 'jobId required' }, { status: 400 });
    if (!['refund', 'credit'].includes(choice)) {
      return Response.json({ error: 'Choose refund or credit.' }, { status: 400 });
    }

    const svc = base44.asServiceRole.entities;
    const job = await svc.JobPost.get(jobId);
    if (!job) return Response.json({ error: 'Job not found' }, { status: 404 });
    if (job.buyer_user_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (job.status !== 'expired') {
      return Response.json({ error: 'This job post is not expired.' }, { status: 400 });
    }
    if (job.payment_status !== 'held') {
      return Response.json({ error: 'This job post has already been resolved.' }, { status: 400 });
    }

    const amount = Number(job.charge_amount || 0);

    if (choice === 'refund') {
      if (!job.stripe_payment_intent_id) {
        return Response.json({ error: 'No charge on file to refund.' }, { status: 400 });
      }
      const stripe = await getStripeForApp(base44);
      await stripe.refunds.create({ payment_intent: job.stripe_payment_intent_id });
      await svc.JobPost.update(job.id, { payment_status: 'refunded' });
    } else {
      // Credit: add the held amount to the neighbor's platform credit balance.
      const profiles = await svc.BuyerProfile.filter({ user_id: user.id });
      const profile = profiles[0];
      if (!profile) return Response.json({ error: 'Profile not found' }, { status: 404 });
      const newBalance = Math.round(((Number(profile.credit_balance) || 0) + amount) * 100) / 100;
      await svc.BuyerProfile.update(profile.id, { credit_balance: newBalance });
      await svc.JobPost.update(job.id, { payment_status: 'credited' });
    }

    await svc.Notification.create({
      user_id: user.id,
      type: 'booking',
      title: choice === 'refund' ? 'Refund on its way' : 'Credit added to your account',
      body:
        choice === 'refund'
          ? `$${amount.toFixed(2)} from "${job.title}" is being refunded to your original payment method. It typically arrives in 3–5 business days.`
          : `$${amount.toFixed(2)} from "${job.title}" is now platform credit — it'll be applied automatically to your next job post.`,
      link: '/jobs',
      read: false,
    });

    return Response.json({ success: true, choice });
  } catch (error) {
    console.error('resolveExpiredJob error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});