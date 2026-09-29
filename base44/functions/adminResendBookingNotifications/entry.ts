import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import {
  requireAdmin, readReason, writeAdminAudit, notifyBookingParties,
} from '../../shared/adminAction.ts';
import { sendBookingEmail } from '../../shared/bookingEmails.ts';
import { APP_BASE_URL } from '../../shared/safeOrigin.ts';

// Re-sends a booking's email + in-app notice when one went missing. Recipients
// are always derived from the booking itself — never from the request — so this
// can't be used to mail the app's data to an arbitrary address.
const KINDS = {
  confirmation: {
    event: 'approved',
    title: 'Booking confirmation re-sent',
    body: (b) => `"${b.listing_title}" — here's your confirmation again.`,
  },
  approval_request: {
    event: 'created',
    title: 'Approval request re-sent',
    body: (b) => `"${b.listing_title}" is waiting for a parent's approval.`,
  },
  receipt: {
    event: 'completed',
    title: 'Receipt re-sent',
    body: (b) => `"${b.listing_title}" — here's your receipt again.`,
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44, req);
    if (auth.error) return auth.error;
    const { user, ip } = auth;

    const body = await req.json();
    const { bookingId } = body;
    const kind = body?.kind;
    if (!bookingId) return Response.json({ error: 'bookingId required' }, { status: 400 });
    if (!KINDS[kind]) {
      return Response.json({ error: `kind must be one of ${Object.keys(KINDS).join(', ')}` }, { status: 400 });
    }
    const reason = readReason(body);
    if (reason.error) return Response.json({ error: reason.error }, { status: 400 });

    const svc = base44.asServiceRole.entities;
    const booking = await svc.Booking.get(bookingId).catch(() => null);
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

    const config = KINDS[kind];

    await notifyBookingParties(base44, booking, {
      type: 'booking',
      title: config.title,
      body: config.body(booking),
      link: `/bookings/${booking.id}`,
    });

    await sendBookingEmail(base44, {
      booking,
      event: config.event,
      origin: APP_BASE_URL,
    });

    await writeAdminAudit(base44, {
      admin: user,
      action: 'resend_notifications',
      actionGroup: 'other',
      targetType: 'Booking',
      targetId: booking.id,
      bookingId: booking.id,
      subjectUserId: booking.buyer_user_id,
      reasonCode: reason.reasonCode,
      reasonNote: reason.reasonNote,
      before: {},
      after: { kind, email_event: config.event },
      summary: `Re-sent the ${kind.replace(/_/g, ' ')} for "${booking.listing_title}".`,
      ip,
    });

    return Response.json({ success: true, kind });
  } catch (error) {
    console.error('adminResendBookingNotifications error:', error.message);
    return Response.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
});