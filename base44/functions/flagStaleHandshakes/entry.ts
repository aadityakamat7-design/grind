import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { notifyAdmins } from '../../shared/notifyAdmins.ts';

// Flags one-sided completions for review. A job is "stale" when one side has
// tapped Finish but the other hasn't within 24 hours — the funds stay held and
// are NOT released. Our team reviews the dispute before any payout.
const STALE_HOURS = 24;

Deno.serve(async (_req) => {
  try {
    const base44 = createClientFromRequest(_req);
    const svc = base44.asServiceRole.entities;
    const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);

    const bookings = await svc.Booking.filter({ status: 'in_progress' }, '-updated_date', 200);
    const stale = bookings.filter((b) => {
      if (b.dispute_flagged_at) return false;
      const teenDone = !!b.teen_finished_at;
      const buyerDone = !!b.buyer_finished_at;
      if (teenDone === buyerDone) return false; // both done or neither — not one-sided
      const finishedAt = teenDone ? b.teen_finished_at : b.buyer_finished_at;
      return new Date(finishedAt) < cutoff;
    });

    for (const b of stale) {
      await svc.Booking.update(b.id, {
        dispute_flagged_at: new Date().toISOString(),
        payout_status: 'pending_review',
        payout_review_reason: 'One-sided completion — other side did not confirm within 24h',
      });
      for (const uid of [b.teen_user_id, b.buyer_user_id, b.parent_user_id].filter(Boolean)) {
        await svc.Notification.create({
          user_id: uid,
          type: 'booking',
          title: 'Job flagged for review',
          body: `"${b.listing_title}" has a one-sided completion. Our team is reviewing it before any payment is released.`,
          link: `/bookings/${b.id}`,
        });
      }
      await notifyAdmins(base44, {
        type: 'booking',
        title: 'One-sided completion needs review',
        body: `"${b.listing_title}" — only one side confirmed finish within 24h. Payment is held pending review.`,
        link: '/admin',
      });
    }

    return Response.json({ flagged: stale.length });
  } catch (error) {
    console.error('flagStaleHandshakes error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});