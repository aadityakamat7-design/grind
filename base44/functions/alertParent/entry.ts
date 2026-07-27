import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Safety alert: the teen on a booking can instantly notify their linked parent.
// Validates that the caller is actually the teen on the booking — a random
// user can't send alerts to someone else's parent.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookingId } = await req.json();
    if (!bookingId) return Response.json({ error: 'bookingId required' }, { status: 400 });

    const booking = await base44.asServiceRole.entities.Booking.get(bookingId);
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });
    if (booking.teen_user_id !== user.id) {
      return Response.json({ error: 'Only the teen on this job can send a safety alert.' }, { status: 403 });
    }
    if (!booking.parent_user_id) {
      return Response.json({ error: 'No parent is linked to this teen.' }, { status: 400 });
    }

    await base44.asServiceRole.entities.Notification.create({
      user_id: booking.parent_user_id,
      type: 'safety',
      title: `🚨 Safety alert from ${booking.teen_display_name}`,
      body: `${booking.teen_display_name} tapped the safety button during "${booking.listing_title}" at ${booking.address || 'the job location'}. Please check in now.`,
      link: `/bookings/${booking.id}`,
      read: false,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('alertParent error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});