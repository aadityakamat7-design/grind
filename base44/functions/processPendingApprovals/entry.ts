import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { verifyWorkflowCall } from '../../shared/workflowAuth.ts';
import { refundEscrowPayment } from '../../shared/stripeRefund.ts';
import { sendBookingEmail } from '../../shared/bookingEmails.ts';
import { writeAuditLog } from '../../shared/auditLog.ts';
import { APP_BASE_URL } from '../../shared/safeOrigin.ts';
import { notifyAdmins } from '../../shared/notifyAdmins.ts';

// Runs every 30 minutes (workflow: Pending Approvals). A held payment must never
// sit stuck waiting for a parent:
//
//   1. REMINDER — 12 hours before the job starts, or 48 hours after the request
//      was made, whichever comes first: one reminder (in-app + email) with a link
//      to the exact approval.
//   2. AUTO-DECLINE — 2 hours before the job starts with still no answer: the
//      request is declined, the neighbor is refunded in full, and the teen, the
//      neighbor and the parent are told. (A request made less than an hour before
//      that point gets a one-hour grace period so the parent always has a chance.)
const HOUR = 3600000;

Deno.serve(async (req) => {
  const denied = await verifyWorkflowCall(req);
  if (denied) return denied;
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole.entities;
    const now = Date.now();

    const pending = await svc.Booking.filter(
      { status: 'pending_parent_approval', payment_status: 'held' },
      'scheduled_start',
      200,
    );

    let reminded = 0;
    let declined = 0;
    let failed = 0;

    for (const b of pending) {
      const created = new Date(b.created_date).getTime();
      let start = b.scheduled_start ? new Date(b.scheduled_start).getTime() : NaN;
      // A job with no start time is treated as starting 48 hours after the request.
      if (Number.isNaN(start)) start = created + 48 * HOUR;

      const reminderAt = Math.min(start - 12 * HOUR, created + 48 * HOUR);
      const declineAt = Math.max(start - 2 * HOUR, created + HOUR);
      const link = `/parent/approvals?item=${b.id}`;

      if (now >= declineAt) {
        // Refund first — if the refund fails nothing else changes and an admin is told.
        try {
          await refundEscrowPayment(base44, b);
        } catch (err: any) {
          failed++;
          console.error('processPendingApprovals refund failed:', b.id, err?.message);
          await notifyAdmins(base44, {
            type: 'payment',
            title: 'Auto-decline refund failed',
            body: `Booking "${b.listing_title}" (${b.id}) could not be refunded after the parent did not respond. Please refund it manually.`,
            link: '/admin',
          }).catch(() => {});
          continue;
        }
        await svc.Booking.update(b.id, { status: 'denied', payment_status: 'refunded' });

        const posts = await svc.JobPost.filter({ booking_id: b.id });
        if (posts[0] && posts[0].status === 'assigned') {
          await svc.JobPost.update(posts[0].id, {
            status: 'open', assigned_teen_user_id: '', assigned_teen_name: '', booking_id: '',
          });
        }

        const notices = [
          { user_id: b.teen_user_id, title: 'Booking not approved in time', body: `"${b.listing_title}" was declined automatically because no one approved it before the start time.` },
          { user_id: b.buyer_user_id, title: 'Refunded — booking not approved in time', body: `The parent didn't respond before "${b.listing_title}" was due to start. Your payment has been refunded in full.` },
          { user_id: b.parent_user_id, title: 'Request declined automatically', body: `You didn't answer "${b.listing_title}" before it was due to start, so it was declined and the neighbor was refunded.` },
        ];
        for (const n of notices) {
          if (!n.user_id) continue;
          await svc.Notification.create({ ...n, type: 'approval', link: `/bookings/${b.id}`, read: false });
        }
        await sendBookingEmail(base44, { booking: b, event: 'expired', origin: APP_BASE_URL });
        await writeAuditLog(base44, {
          actor_user_id: 'system', actor_role: 'system', action: 'booking_auto_declined',
          category: 'approval', target_type: 'Booking', target_id: b.id,
          summary: `Auto-declined "${b.listing_title}" — no parent response before the start time; refunded`,
          metadata: { refunded: true, price_total: b.price_total },
        });
        declined++;
        continue;
      }

      if (now >= reminderAt && b.parent_user_id) {
        const already = await svc.Notification.filter({ user_id: b.parent_user_id, type: 'approval_reminder', link }, '-created_date', 1);
        if (already.length) continue;
        await svc.Notification.create({
          user_id: b.parent_user_id,
          type: 'approval_reminder',
          title: 'Reminder: a request needs your answer',
          body: `"${b.listing_title}" with ${b.teen_display_name} is still waiting. It will be declined automatically if there is no answer before the job starts.`,
          link,
          read: false,
        });
        await sendBookingEmail(base44, { booking: b, event: 'approval_reminder', origin: APP_BASE_URL });
        reminded++;
      }
    }

    return Response.json({ ok: true, checked: pending.length, reminded, declined, failed });
  } catch (error: any) {
    console.error('processPendingApprovals failed:', error?.message || error);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});