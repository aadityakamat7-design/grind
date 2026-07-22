import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { refundHeldPayment } from '../../shared/stripeRefund.ts';

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

    await refundHeldPayment(job);

    await base44.asServiceRole.entities.JobPost.update(job.id, {
      status: 'cancelled',
      payment_status: job.payment_status === 'unpaid' ? 'unpaid' : 'refunded',
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('cancelJobPost error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});