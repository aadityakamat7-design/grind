import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { isAccountSuspended, suspendedError } from '../../shared/accountStatus.ts';
import { refundEscrowPayment } from '../../shared/stripeRefund.ts';
import { writeAuditLog } from '../../shared/auditLog.ts';
import { getClientIp } from '../../shared/rateLimiter.ts';
import { getSafeOrigin } from '../../shared/safeOrigin.ts';
import { sendBookingEmail } from '../../shared/bookingEmails.ts';
import { isParentVerifiedByStripe } from '../../shared/parentVerification.ts';
import { hasAcceptedCurrentTerms } from '../../shared/termsAcceptance.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (isAccountSuspended(user)) return suspendedError();

    // ── Terms of Service gate ──
    // The parent must have accepted the current Terms before approving.
    const termsAccepted = await hasAcceptedCurrentTerms(base44.asServiceRole.entities, user.id);
    if (!termsAccepted) {
      return Response.json({
        error: 'Please accept the updated Terms of Service before approving bookings. Open the app to review and accept them.',
      }, { status: 403 });
    }

    const { bookingId, approve } = await req.json();
    if (!bookingId) return Response.json({ error: 'bookingId required' }, { status: 400 });

    const booking = await base44.asServiceRole.entities.Booking.get(bookingId);
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });
    if (booking.parent_user_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // HARD GUARD: the booking must be in pending_parent_approval with payment
    // actually held. This is the only state that is approvable or deniable.
    // A payment_pending booking (no payment yet) cannot be approved or denied.
    if (booking.status !== 'pending_parent_approval') {
      return Response.json({ error: 'Booking is not awaiting approval' }, { status: 400 });
    }
    if (booking.payment_status !== 'held') {
      return Response.json({ error: "The neighbor's payment hasn't been confirmed yet. Please wait for payment before approving or denying." }, { status: 400 });
    }

    // A booking created during a testing window must never become a real
    // appointment — test-mode bookings can be denied but not confirmed.
    if (approve && booking.is_test_mode) {
      return Response.json({ error: 'This booking was created in test mode and cannot be confirmed. Turn off test mode to create real bookings.' }, { status: 403 });
    }

    // HARD GUARD: the parent's Stripe Connect account must be fully verified
    // (details_submitted, payouts_enabled, no currently_due) before they can
    // approve a booking. Checked on the server every time — never trust a
    // status sent from the browser. Denial is always allowed (refunds the
    // neighbor); only approval requires the Connect check.
    if (approve) {
      const connectCheck = await isParentVerifiedByStripe(base44, booking.parent_user_id);
      if (!connectCheck.verified) {
        return Response.json({
          error: connectCheck.message || 'You must complete your Stripe payout setup before you can approve bookings.',
          connectStatus: connectCheck.status,
        }, { status: 403 });
      }
    }

    if (approve) {
      await base44.asServiceRole.entities.Booking.update(booking.id, { status: 'confirmed' });

      if (booking.recurring_series_id) {
        await base44.asServiceRole.entities.RecurringSeries.update(booking.recurring_series_id, {
          parent_approved: true,
        });
      }
      await writeAuditLog(base44, {
        actor_user_id: user.id, actor_role: user.app_role || 'parent', action: 'booking_approved',
        category: 'approval', target_type: 'Booking', target_id: booking.id,
        summary: `Approved "${booking.listing_title}" for ${booking.teen_display_name}`,
        metadata: { price_total: booking.price_total, teen_user_id: booking.teen_user_id },
        ip: getClientIp(req),
      });
      const threads = await base44.asServiceRole.entities.MessageThread.filter({ booking_id: booking.id });
      if (threads[0]) {
        await base44.asServiceRole.entities.MessageThread.update(threads[0].id, { is_confirmed: true });
      }
      await base44.asServiceRole.entities.Notification.create({
        user_id: booking.teen_user_id,
        type: 'approval',
        title: 'Booking approved! 🎉',
        body: `Your parent approved "${booking.listing_title}". You can now start the job.`,
        link: `/bookings/${booking.id}`,
        read: false,
      });
      await base44.asServiceRole.entities.Notification.create({
        user_id: booking.buyer_user_id,
        type: 'booking',
        title: 'Booking confirmed ✅',
        body: `The parent approved "${booking.listing_title}". You can now start the job.`,
        link: `/bookings/${booking.id}?confirmed=1`,
        read: false,
      });
      const origin = getSafeOrigin(req);
      await sendBookingEmail(base44, { booking, event: 'approved', origin });
    } else {
      // Deny: refund the held escrow payment. refundEscrowPayment has a hard
      // guard (assertRefundable) that THROWS if the booking has no captured
      // payment. This prevents refunding an unpaid booking — the root cause
      // of the negative-balance bug.
      try {
        await refundEscrowPayment(base44, booking);
      } catch (refundErr) {
        console.error('decideBooking deny: refund REJECTED:', refundErr.message);
        return Response.json({ error: 'Could not process refund — no captured payment found for this booking. Please contact support.' }, { status: 500 });
      }
      await base44.asServiceRole.entities.Booking.update(booking.id, {
        status: 'denied',
        payment_status: 'refunded',
      });
      await writeAuditLog(base44, {
        actor_user_id: user.id, actor_role: user.app_role || 'parent', action: 'booking_denied',
        category: 'approval', target_type: 'Booking', target_id: booking.id,
        summary: `Denied "${booking.listing_title}" for ${booking.teen_display_name}`,
        metadata: { refunded: true, price_total: booking.price_total },
        ip: getClientIp(req),
      });

      const deniedJobPosts = await base44.asServiceRole.entities.JobPost.filter({ booking_id: booking.id });
      if (deniedJobPosts[0] && deniedJobPosts[0].status === 'assigned') {
        await base44.asServiceRole.entities.JobPost.update(deniedJobPosts[0].id, {
          status: 'open',
          assigned_teen_user_id: '',
          assigned_teen_name: '',
          booking_id: '',
        });
      }

      await base44.asServiceRole.entities.Notification.create({
        user_id: booking.teen_user_id,
        type: 'approval',
        title: 'Booking denied',
        body: `Your parent denied the booking for "${booking.listing_title}".`,
        link: `/bookings/${booking.id}`,
        read: false,
      });
      await base44.asServiceRole.entities.Notification.create({
        user_id: booking.buyer_user_id,
        type: 'booking',
        title: 'Booking denied',
        body: `The parent denied your booking for "${booking.listing_title}". Your payment will be refunded.`,
        link: `/bookings/${booking.id}`,
        read: false,
      });
      const origin = getSafeOrigin(req);
      await sendBookingEmail(base44, { booking, event: 'denied', origin, excludeUserId: user.id });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('decideBooking error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});