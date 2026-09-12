import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { verifyWorkflowCall } from '../../shared/workflowAuth.ts';
import { APP_BASE_URL } from '../../shared/safeOrigin.ts';

// Daily sweep: finds open job posts whose 7-day no-taker window has elapsed,
// marks them expired, and notifies the neighbor to choose a refund or keep
// the amount as platform credit. Called by the JobPostExpiry scheduled workflow.
Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const authError = verifyWorkflowCall(body);
    if (authError) return authError;

    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole.entities;

    const now = new Date();
    const openJobs = await svc.JobPost.filter({ status: 'open' }, '-created_date', 200);
    const expired = openJobs.filter((j) => j.expires_at && new Date(j.expires_at) < now);

    let count = 0;
    for (const job of expired) {
      // Skip any already resolved (shouldn't happen with status filter, but guard).
      if (job.payment_status !== 'held') continue;
      await svc.JobPost.update(job.id, { status: 'expired' });

      await svc.Notification.create({
        user_id: job.buyer_user_id,
        type: 'booking',
        title: 'Your job post expired',
        body: `No teen took "${job.title}" within a week. Choose a full refund or keep it as platform credit for your next post.`,
        link: `/jobs/${job.id}/resolve`,
        read: false,
      });

      // Email the neighbor so they see the choice even without the app open.
      try {
        const users = await svc.User.filter({ id: job.buyer_user_id });
        const buyer = users[0];
        if (buyer?.email) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: buyer.email,
            subject: `Your job post "${job.title}" expired — choose refund or credit`,
            body:
              `Hi ${buyer.full_name || ''},\n\n` +
              `No teen took "${job.title}" within 7 days, so the post has expired. ` +
              `Your $${Number(job.charge_amount || 0).toFixed(2)} is still held.\n\n` +
              `Choose what happens next:\n` +
              `• Refund to your original payment method, or\n` +
              `• Keep it as platform credit to use on your next job post.\n\n` +
              `Decide here: ${APP_BASE_URL}/jobs/${job.id}/resolve\n\n` +
              `— The Blockwork team`,
          });
        }
      } catch (err) {
        console.error('expireJobPosts email error:', err.message);
      }

      count++;
    }

    return Response.json({ expired: count });
  } catch (error) {
    console.error('expireJobPosts error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});