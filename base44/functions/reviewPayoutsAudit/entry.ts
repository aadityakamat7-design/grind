import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { reviewBookingPayout, saveReview } from '../../shared/payoutReview.ts';

// Retroactive integrity audit: runs the review agent across ALL bookings that
// have ever had a payout (payment_status 'released', regardless of current
// payout_status — includes already-transferred ones). Reports any that would
// have been flagged: amount mismatches, duplicates, self-dealing, or payouts on
// bookings that never properly completed.
//
// This is a one-time integrity check on money that has already moved. All
// review records are created with audit_mode=true so they don't interfere with
// live review queues. Admin-only.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.app_role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const svc = base44.asServiceRole.entities;
    const allReleased: any[] = [];
    let skip = 0;
    let hasMore = true;
    while (hasMore) {
      const batch = await svc.Booking.list('-created_date', 200, skip);
      const released = batch.filter((b) => b.payment_status === 'released');
      allReleased.push(...released);
      hasMore = batch.length === 200;
      skip += 200;
    }

    let audited = 0, wouldClear = 0, wouldHold = 0, wouldBlock = 0;
    const flagged: any[] = [];
    const errors: any[] = [];

    for (const booking of allReleased) {
      try {
        const result = await reviewBookingPayout(base44, booking);
        await saveReview(base44, booking, result, { auditMode: true, status: result.recommended_action === 'auto_approve' ? 'auto_approved' : 'pending' });
        audited++;
        if (result.recommended_action === 'auto_approve') wouldClear++;
        else if (result.recommended_action === 'reject') { wouldBlock++; flagged.push({ booking_id: booking.id, title: booking.listing_title, amount: result.amount, payout_status: booking.payout_status, risk: result.risk_level, flags: result.flags, transferred: booking.payout_status === 'transferred' }); }
        else { wouldHold++; flagged.push({ booking_id: booking.id, title: booking.listing_title, amount: result.amount, payout_status: booking.payout_status, risk: result.risk_level, flags: result.flags, transferred: booking.payout_status === 'transferred' }); }
      } catch (err) {
        errors.push({ booking_id: booking.id, error: err.message });
      }
    }

    return Response.json({
      total_audited: audited,
      would_clear: wouldClear,
      would_hold: wouldHold,
      would_block: wouldBlock,
      flagged,
      errors,
    });
  } catch (error) {
    console.error('reviewPayoutsAudit error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});