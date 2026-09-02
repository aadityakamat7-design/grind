import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { attemptBookingPayout } from '../../shared/payoutTransfer.ts';
import { verifyWorkflowCall } from '../../shared/workflowAuth.ts';

// Processes bookings whose 7-day settlement period has elapsed. Called daily
// by a scheduled workflow. For each eligible booking (payout_status:
// awaiting_settlement and payout_eligible_at in the past), attempts the Stripe
// Connect transfer to the parent's (or independent teen's) bank.

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const authError = verifyWorkflowCall(body);
    if (authError) return authError;

    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole.entities;

    const bookings = await svc.Booking.filter({ payout_status: 'awaiting_settlement' }, '-released_at', 200);
    const now = new Date();
    const eligible = bookings.filter((b) => b.payout_eligible_at && new Date(b.payout_eligible_at) <= now);

    let processed = 0;
    let failed = 0;
    for (const b of eligible) {
      try {
        const result = await attemptBookingPayout(base44, b);
        if (result.status === 'transferred') processed++;
        else failed++;
      } catch (err) {
        console.error(`Payout failed for booking ${b.id}:`, err.message);
        failed++;
      }
    }

    return Response.json({ checked: eligible.length, processed, failed });
  } catch (error) {
    console.error('processSettledPayouts error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});