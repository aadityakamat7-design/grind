import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { APP_BASE_URL } from '../../shared/safeOrigin.ts';
import { verifyWorkflowCall } from '../../shared/workflowAuth.ts';

// Called on a schedule. Notifies the teen and buyer of confirmed bookings
// starting within the next hour, once each (guarded by reminder_sent).
Deno.serve(async (req) => {
  try {
    // Called by a scheduled workflow — no user session is available, so we
    // use the service role directly. Only the workflow engine can invoke this.
    const body = await req.json();
    const authError = verifyWorkflowCall(body);
    if (authError) return authError;

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

    const origin = APP_BASE_URL;

    for (const b of due) {
      const when = new Date(b.scheduled_start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const deepLink = `${origin}/bookings/${b.id}`;

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

      // Email reminder to both parties
      const [teenUsers, buyerUsers] = await Promise.all([
        svc.User.filter({ id: b.teen_user_id }),
        svc.User.filter({ id: b.buyer_user_id }),
      ]);
      if (teenUsers[0]?.email) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: teenUsers[0].email,
            subject: `Your job "${b.listing_title}" starts soon`,
            body:
              `Hi ${b.teen_display_name || ''},\n\n` +
              `This is a quick reminder: "${b.listing_title}" with ${b.buyer_name || 'your neighbor'} starts at ${when}.\n\n` +
              `View your booking here:\n${deepLink}\n\n` +
              `— The Blockwork team`,
          });
        } catch (err) {
          console.error('Booking reminder email (teen) error:', err.message);
        }
      }
      if (buyerUsers[0]?.email) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: buyerUsers[0].email,
            subject: `Your booking "${b.listing_title}" starts soon`,
            body:
              `Hi ${b.buyer_name || ''},\n\n` +
              `This is a quick reminder: ${b.teen_display_name || 'Your teen'} is scheduled for "${b.listing_title}" at ${when}.\n\n` +
              `View your booking here:\n${deepLink}\n\n` +
              `— The Blockwork team`,
          });
        } catch (err) {
          console.error('Booking reminder email (buyer) error:', err.message);
        }
      }

      await svc.Booking.update(b.id, { reminder_sent: true });
    }

    return Response.json({ success: true, reminded: due.length });
  } catch (error) {
    console.error('sendBookingReminders error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});