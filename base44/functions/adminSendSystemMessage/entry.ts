import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import {
  requireAdmin, readReason, writeAdminAudit, notifyBookingParties,
} from '../../shared/adminAction.ts';
import { maskPII } from '../../shared/piiMask.ts';

// Posts a message into the booking's thread labelled "Blockwork Support".
// This is the same thread the parties already use, so the guidance lands where
// they will actually read it — and a parent can see it too.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44, req);
    if (auth.error) return auth.error;
    const { user, ip } = auth;

    const body = await req.json();
    const { bookingId } = body;
    const message = String(body?.message || '').trim().slice(0, 2000);
    if (!bookingId) return Response.json({ error: 'bookingId required' }, { status: 400 });
    if (!message) return Response.json({ error: 'Write the message first.' }, { status: 400 });
    const reason = readReason(body);
    if (reason.error) return Response.json({ error: reason.error }, { status: 400 });

    const svc = base44.asServiceRole.entities;
    const booking = await svc.Booking.get(bookingId).catch(() => null);
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

    const threads = await svc.MessageThread.filter({ booking_id: booking.id });
    const thread = threads[0];
    if (!thread) {
      return Response.json(
        { error: 'This booking has no message thread yet, so there is nowhere to post. Send the parties a notification instead.' },
        { status: 400 },
      );
    }

    // Same PII masking the rest of messaging uses, so a support message can't
    // leak contact details back into a thread that isn't confirmed yet.
    const masked = maskPII(message, thread.is_confirmed === true);
    const safeBody = masked.text;

    const participants = Array.isArray(thread.participant_ids) && thread.participant_ids.length
      ? thread.participant_ids
      : [booking.buyer_user_id, booking.teen_user_id, booking.parent_user_id].filter(Boolean);

    await svc.Message.create({
      thread_id: thread.id,
      sender_id: user.id,
      sender_name: 'Blockwork Support',
      body: safeBody,
      participant_ids: participants,
      flagged: masked.flagged,
      pii_masked: safeBody !== message,
    });
    await svc.MessageThread.update(thread.id, {
      last_message: safeBody.slice(0, 120),
      last_message_at: new Date().toISOString(),
    });

    await notifyBookingParties(base44, booking, {
      type: 'message',
      title: 'Message from Blockwork Support',
      body: `Support posted an update on "${booking.listing_title}".`,
      link: `/messages/${thread.id}`,
    });

    await writeAdminAudit(base44, {
      admin: user,
      action: 'send_system_message',
      actionGroup: 'booking',
      targetType: 'Booking',
      targetId: booking.id,
      bookingId: booking.id,
      subjectUserId: booking.buyer_user_id,
      reasonCode: reason.reasonCode,
      reasonNote: reason.reasonNote,
      before: {},
      after: { thread_id: thread.id, message: safeBody },
      summary: `Posted a Blockwork Support message on "${booking.listing_title}".`,
      ip,
    });

    return Response.json({ success: true, thread_id: thread.id });
  } catch (error) {
    console.error('adminSendSystemMessage error:', error.message);
    return Response.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
});