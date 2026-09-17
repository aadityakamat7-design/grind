import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { attemptBookingPayout } from '../../shared/payoutTransfer.ts';

// Reconciliation pass — the daily scheduled job that keeps payouts moving.
// Finds every released booking whose payout hasn't been transferred yet,
// retries ones that are now eligible (settlement period passed, account now
// active, new-account hold expired, destination now resolvable), and reports
// anything still stuck with the specific blocking reason.
//
// Retries:
//   - pending_release / awaiting_settlement past their payout_eligible_at
//   - awaiting_new_account_hold / pending_new_account_hold past their hold
//   - awaiting_active_account / awaiting_bank (account may now be active)
//   - blocked_no_destination (destination may now resolve)
//
// Reports as stuck (does NOT retry):
//   - pending_review (needs explicit admin approval)
//   - duplicate_blocked (terminal — needs admin investigation)
//   - pending_release/awaiting_settlement not yet past settlement
//   - awaiting_new_account_hold not yet past hold

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    // Auth: the platform injects _workflowSecret = WORKFLOW_SECRET on workflow calls.
    const WF_SECRET = Deno.env.get('WORKFLOW_SECRET');
    if (!WF_SECRET || body?._workflowSecret !== WF_SECRET) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole.entities;

    const now = new Date();

    // Gather all released bookings that haven't been transferred or paid out
    const retryableStatuses = [
      'pending_release',
      'awaiting_active_account',
      'awaiting_new_account_hold',
      'blocked_no_destination',
      'pending_review',
      // Legacy statuses
      'awaiting_settlement',
      'pending_new_account_hold',
      'awaiting_bank',
      'not_started',
    ];

    const allBookings: any[] = [];
    for (const status of retryableStatuses) {
      try {
        const batch = await svc.Booking.filter({ payment_status: 'released', payout_status: status }, '-released_at', 200);
        allBookings.push(...batch);
      } catch (e) {
        console.error(`Failed to fetch ${status}:`, e.message);
      }
    }

    // Deduplicate (a booking might match multiple status filters)
    const seen = new Set();
    const bookings = allBookings.filter((b) => {
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });

    let processed = 0;
    let failed = 0;
    const stuck: any[] = [];

    for (const b of bookings) {
      const ps = b.payout_status;

      // --- Time-based holds: check if eligible yet ---
      const isSettlement = ps === 'pending_release' || ps === 'awaiting_settlement' || ps === 'not_started';
      if (isSettlement) {
        if (!b.payout_eligible_at || new Date(b.payout_eligible_at) > now) {
          stuck.push({
            booking_id: b.id, title: b.listing_title, status: ps,
            reason: `Settlement period ends ${b.payout_eligible_at ? new Date(b.payout_eligible_at).toLocaleString('en-US') : 'unknown'}`,
          });
          continue;
        }
      }

      const isHold = ps === 'awaiting_new_account_hold' || ps === 'pending_new_account_hold';
      if (isHold) {
        if (!b.new_account_hold_eligible_at || new Date(b.new_account_hold_eligible_at) > now) {
          stuck.push({
            booking_id: b.id, title: b.listing_title, status: ps,
            reason: `New account hold ends ${b.new_account_hold_eligible_at ? new Date(b.new_account_hold_eligible_at).toLocaleString('en-US') : 'unknown'}`,
          });
          continue;
        }
      }

      // --- Admin review: do NOT retry, just report ---
      if (ps === 'pending_review') {
        stuck.push({
          booking_id: b.id, title: b.listing_title, status: ps,
          reason: b.payout_review_reason || 'Waiting for admin approval',
        });
        continue;
      }

      // --- Duplicate blocked: terminal, report ---
      if (ps === 'duplicate_blocked') {
        stuck.push({
          booking_id: b.id, title: b.listing_title, status: ps,
          reason: b.payout_review_reason || 'Duplicate transfer detected',
        });
        continue;
      }

      // --- Eligible for retry: awaiting_active_account, blocked_no_destination,
      //     settlement-ready, hold-ready ---
      try {
        const result = await attemptBookingPayout(base44, b);
        if (result.status === 'transferred') {
          processed++;
        } else {
          failed++;
          stuck.push({
            booking_id: b.id, title: b.listing_title, status: result.status,
            reason: result.reason || result.status,
          });
        }
      } catch (err) {
        console.error(`Reconciliation: payout failed for booking ${b.id}:`, err.message);
        failed++;
        stuck.push({
          booking_id: b.id, title: b.listing_title, status: ps,
          reason: `Error: ${err.message}`,
        });
      }
    }

    return Response.json({
      checked: bookings.length,
      processed,
      failed,
      stuck: stuck.slice(0, 50), // Cap to avoid huge responses
    });
  } catch (error) {
    console.error('processSettledPayouts error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});