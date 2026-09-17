import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { notifyAdmins } from '../../shared/notifyAdmins.ts';

// Flags bookings for admin/dispute review when the teen finished and uploaded
// photos but the neighbor didn't confirm or dispute within 72 hours. Does NOT
// auto-release — the admin reviews the completion photos and decides whether
// to release the payment or refund the neighbor.
const STALE_HOURS = 72;

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    // Auth: the platform injects _workflowSecret = WORKFLOW_SECRET on workflow calls.
    const WF_SECRET = Deno.env.get('WORKFLOW_SECRET');
    if (!WF_SECRET || body?._workflowSecret !== WF_SECRET) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Called by a scheduled workflow — no user session is available, so we
    // use the service role directly. Only the workflow engine can invoke this.
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole.entities;
    const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);

    const bookings = await svc.Booking.filter({ status: 'in_progress' }, '-updated_date', 200);
    const stale = bookings.filter((b) => {
      // Teen must have finished (with photos) but buyer hasn't confirmed or disputed
      if (!b.teen_finished_at) return false;
      if (b.buyer_finished_at || b.buyer_disputed_at) return false;
      if (b.dispute_flagged_at) return false; // Already flagged
      return new Date(b.teen_finished_at) < cutoff;
    });

    let flagged = 0;
    for (const b of stale) {
      try {
        await svc.Booking.update(b.id, {
          dispute_flagged_at: new Date().toISOString(),
          payout_status: 'pending_review',
          payout_review_reason: 'Neighbor did not confirm or dispute within 72 hours of teen completion — manual review required',
        });
        // Notify the buyer one last time
        await svc.Notification.create({
          user_id: b.buyer_user_id,
          type: 'booking',
          title: 'Action needed — job pending review',
          body: `"${b.listing_title}" — you haven't confirmed or reported a problem. Our team is now reviewing the completion photos to resolve payment.`,
          link: `/bookings/${b.id}`,
          read: false,
        });
        // Alert admins
        await notifyAdmins(base44, {
          type: 'booking',
          title: 'Stale completion needs review',
          body: `"${b.listing_title}" — the teen finished 72+ hours ago but the neighbor never confirmed or disputed. Review the completion photos and release or refund.`,
          link: '/admin',
        });
        flagged++;
      } catch (err) {
        console.error(`Flag stale failed for booking ${b.id}:`, err.message);
      }
    }

    return Response.json({ checked: stale.length, flagged });
  } catch (error) {
    console.error('flagStaleHandshakes error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});