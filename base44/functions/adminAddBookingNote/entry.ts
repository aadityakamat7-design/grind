import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { requireAdmin, readReason, writeAdminAudit } from '../../shared/adminAction.ts';

// Internal admin note on a booking. Notes are append-only and visible only to
// admins — the booking's parties are never notified and never see them.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44, req);
    if (auth.error) return auth.error;
    const { user, ip } = auth;

    const body = await req.json();
    const { bookingId } = body;
    const note = String(body?.note || '').trim().slice(0, 1000);
    if (!bookingId) return Response.json({ error: 'bookingId required' }, { status: 400 });
    if (!note) return Response.json({ error: 'Write the note first.' }, { status: 400 });
    const reason = readReason(body);
    if (reason.error) return Response.json({ error: reason.error }, { status: 400 });

    const svc = base44.asServiceRole.entities;
    const booking = await svc.Booking.get(bookingId).catch(() => null);
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

    const entry = {
      note,
      admin_user_id: user.id,
      admin_name: user.full_name || user.email || 'Admin',
      at: new Date().toISOString(),
    };
    const notes = Array.isArray(booking.admin_notes) ? booking.admin_notes : [];
    await svc.Booking.update(booking.id, {
      admin_notes: [...notes, entry],
      admin_action_at: entry.at,
    });

    await writeAdminAudit(base44, {
      admin: user,
      action: 'add_note',
      actionGroup: 'booking',
      targetType: 'Booking',
      targetId: booking.id,
      bookingId: booking.id,
      subjectUserId: booking.buyer_user_id,
      reasonCode: reason.reasonCode,
      reasonNote: reason.reasonNote,
      before: { admin_notes: notes.length },
      after: { admin_notes: notes.length + 1, note },
      summary: `Added an internal note to "${booking.listing_title}".`,
      ip,
    });

    return Response.json({ success: true, note: entry });
  } catch (error) {
    console.error('adminAddBookingNote error:', error.message);
    return Response.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
});