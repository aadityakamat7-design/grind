import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Called on a schedule. Notifies the teen and buyer of confirmed bookings
// starting within the next hour, once each (guarded by reminder_sent).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole.entities;

    const now = new Date();
    const soon = new Date(now.getTime() + 60 * 60 * 1000);

    const upcoming = await svc.Booking.filter({ status: 'confirmed', reminder_sent: false }, '-created_date', 200);
    const due = upcoming.filter((b) => {
      if (!b.scheduled_start) return false;
      const start = new Date(b.scheduled_start);
      return start >= now && start <= soon;
    });

    for (const b of due) {
      const when = new Date(b.scheduled_start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      await svc.Notification.create({
        user_id: b.teen_user_id,
        type: 'booking',
        title: 'Job starting soon',
        body: `"${b.listing_title}" starts at ${when} with ${b.buyer_name}.`,
        link: `/bookings/${b.id}`,
        read: false,
      });
      await svc.Notification.create({
        user_id: b.buyer_user_id,
        type: 'booking',
        title: 'Job starting soon',
        body: `${b.teen_display_name} is scheduled for "${b.listing_title}" at ${when}.`,
        link: `/bookings/${b.id}`,
        read: false,
      });
      await svc.Booking.update(b.id, { reminder_sent: true });
    }

    return Response.json({ success: true, reminded: due.length });
  } catch (error) {
    console.error('sendBookingReminders error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});