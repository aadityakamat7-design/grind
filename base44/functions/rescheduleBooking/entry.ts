import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Reschedules a booking server-side: validates the caller is a participant,
// updates the scheduled time, and notifies the other party + parent.
// The client can't update Booking.scheduled_start directly (field-level RLS
// locks it to admin) or create notifications for other users.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookingId, newStart } = await req.json();
    if (!bookingId || !newStart) {
      return Response.json({ error: 'bookingId and newStart are required' }, { status: 400 });
    }

    const booking = await base44.asServiceRole.entities.Booking.get(bookingId);
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

    const isParticipant = [booking.buyer_user_id, booking.teen_user_id, booking.parent_user_id].includes(user.id);
    if (!isParticipant) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (!['pending_parent_approval', 'confirmed', 'in_progress'].includes(booking.status)) {
      return Response.json({ error: 'Booking can no longer be rescheduled' }, { status: 400 });
    }

    const isoStart = new Date(newStart).toISOString();
    await base44.asServiceRole.entities.Booking.update(booking.id, { scheduled_start: isoStart });

    const timeStr = new Date(isoStart).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });

    const notifyUser = (uid) =>
      base44.asServiceRole.entities.Notification.create({
        user_id: uid,
        type: 'booking',
        title: 'Booking rescheduled',
        body: `"${booking.listing_title}" was moved to ${timeStr}.`,
        link: `/bookings/${booking.id}`,
        read: false,
      });

    const otherId = user.id === booking.buyer_user_id ? booking.teen_user_id : booking.buyer_user_id;
    if (otherId) await notifyUser(otherId);
    if (booking.parent_user_id && booking.parent_user_id !== user.id) {
      await notifyUser(booking.parent_user_id);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('rescheduleBooking error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});