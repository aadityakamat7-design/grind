import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { reviewBookingPayout, saveReview } from '../../shared/payoutReview.ts';
import { notifyAdmins } from '../../shared/notifyAdmins.ts';

// Batch review pass across all pending payouts (payment_status 'released',
// payout_status not 'transferred'). Processes in batches of 25, writing each
// review record incrementally so a failure partway through doesn't lose
// completed work. Admin-only.
//
// Returns a summary: how many were reviewed, how many cleared, how many held,
// how many blocked, and the list of critical failures.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.app_role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const svc = base44.asServiceRole.entities;
    const BATCH_SIZE = 25;
    const allPending: any[] = [];
    let skip = 0;
    let hasMore = true;
    while (hasMore) {
      const batch = await svc.Booking.list('-created_date', 200, skip);
      const pending = batch.filter((b) => b.payment_status === 'released' && b.payout_status !== 'transferred');
      allPending.push(...pending);
      hasMore = batch.length === 200;
      skip += 200;
    }

    let reviewed = 0, cleared = 0, held = 0, blocked = 0;
    const criticalFailures: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < allPending.length; i++) {
      const booking = allPending[i];
      try {
        const result = await reviewBookingPayout(base44, booking);
        await saveReview(base44, booking, result);
        reviewed++;
        if (result.recommended_action === 'auto_approve') cleared++;
        else if (result.recommended_action === 'reject') { blocked++; criticalFailures.push({ booking_id: booking.id, title: booking.listing_title, flags: result.flags }); }
        else held++;
        if (result.is_critical && result.recommended_action !== 'reject') { blocked++; criticalFailures.push({ booking_id: booking.id, title: booking.listing_title, flags: result.flags }); }
      } catch (err) {
        errors.push({ booking_id: booking.id, error: err.message });
      }
    }

    // One consolidated admin alert for all critical failures in the batch
    if (criticalFailures.length > 0) {
      await notifyAdmins(base44, {
        type: 'payment',
        title: `🚨 ${criticalFailures.length} critical payout failure${criticalFailures.length > 1 ? 's' : ''} blocked`,
        body: criticalFailures.map((f) => `"${f.title}": ${f.flags.join('; ')}`).join('\n'),
        link: '/admin',
      });
    }

    return Response.json({
      total_pending: allPending.length,
      reviewed,
      cleared,
      held,
      blocked,
      critical_failures: criticalFailures,
      errors,
    });
  } catch (error) {
    console.error('reviewPayoutsBatch error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});