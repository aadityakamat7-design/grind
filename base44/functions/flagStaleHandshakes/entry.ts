import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { recordBuyerConfirm } from '../../shared/jobHandshake.ts';
import { verifyWorkflowCall } from '../../shared/workflowAuth.ts';

// Auto-confirms and releases payment for jobs where the teen finished and
// uploaded photos but the neighbor didn't respond within 12 hours. This is
// standard escrow practice — the work is presumed done if the neighbor is
// silent. The funds are released to the parent (auto-pay).
const CONFIRM_HOURS = 12;

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const authError = verifyWorkflowCall(body);
    if (authError) return authError;

    // Called by a scheduled workflow — no user session is available, so we
    // use the service role directly. Only the workflow engine can invoke this.
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole.entities;
    const cutoff = new Date(Date.now() - CONFIRM_HOURS * 60 * 60 * 1000);

    const bookings = await svc.Booking.filter({ status: 'in_progress' }, '-updated_date', 200);
    const stale = bookings.filter((b) => {
      // Teen must have finished (with photos) but buyer hasn't confirmed or disputed
      if (!b.teen_finished_at) return false;
      if (b.buyer_finished_at || b.buyer_disputed_at) return false;
      return new Date(b.teen_finished_at) < cutoff;
    });

    let released = 0;
    for (const b of stale) {
      try {
        const result = await recordBuyerConfirm(base44, b, 0);
        if (result.released) released++;
      } catch (err) {
        console.error(`Auto-confirm failed for booking ${b.id}:`, err.message);
      }
    }

    return Response.json({ checked: stale.length, released });
  } catch (error) {
    console.error('flagStaleHandshakes error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});