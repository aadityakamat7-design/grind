import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { reviewBookingPayout, saveReview } from '../../shared/payoutReview.ts';
import { notifyAdmins } from '../../shared/notifyAdmins.ts';
import { writeAuditLog } from '../../shared/auditLog.ts';

// Reviews a single booking payout through the fraud/error/compliance agent.
// Admin-only. Can be called on any booking with payment_status 'released' that
// hasn't transferred yet. Returns the review record.
//
// If the review clears the payout (low risk, all checks pass), this function
// does NOT auto-transfer — the caller (processPayout or the batch runner)
// decides whether to proceed. This function just produces the assessment.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.app_role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const { bookingId } = await req.json();
    if (!bookingId) return Response.json({ error: 'bookingId required' }, { status: 400 });

    const booking = await base44.asServiceRole.entities.Booking.get(bookingId).catch(() => null);
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

    const result = await reviewBookingPayout(base44, booking);
    const record = await saveReview(base44, booking, result);

    // Critical failures alert admins immediately — not just a queue entry.
    if (result.is_critical) {
      await writeAuditLog(base44, {
        actor_user_id: user.id, actor_role: 'admin', action: 'payout_blocked_critical',
        category: 'security', target_type: 'Booking', target_id: booking.id,
        summary: `Critical payout blocked: ${result.flags.join('; ')}`,
        metadata: { amount: result.amount, flags: result.flags, risk_level: result.risk_level },
      });
      await notifyAdmins(base44, {
        type: 'payment',
        title: '🚨 Critical payout failure blocked',
        body: `Booking "${booking.listing_title}" ($${result.amount.toFixed(2)}) was BLOCKED: ${result.flags.join('; ')}. Review in the admin payout queue.`,
        link: '/admin',
      });
    }

    return Response.json({ review: record, result });
  } catch (error) {
    console.error('reviewPayout error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});