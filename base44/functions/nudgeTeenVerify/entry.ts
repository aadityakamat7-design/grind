import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Lets a parent send a reminder notification to their teen prompting them to
// complete identity verification. Validates that the caller is the parent on
// the booking — a random user can't nudge someone else's teen.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookingId } = await req.json();
    if (!bookingId) return Response.json({ error: 'bookingId required' }, { status: 400 });

    const booking = await base44.asServiceRole.entities.Booking.get(bookingId);
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });
    if (booking.parent_user_id !== user.id) {
      return Response.json({ error: 'Only the parent on this job can send a reminder.' }, { status: 403 });
    }

    await base44.asServiceRole.entities.Notification.create({
      user_id: booking.teen_user_id,
      type: 'identity_nudge',
      title: `Reminder from your parent`,
      body: `Your parent is waiting to approve "${booking.listing_title}". Verify your identity so they can approve it.`,
      link: '/account',
      read: false,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('nudgeTeenVerify error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});