import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Called on a schedule. Reminds both parties on a completed booking to leave
// a review once it has been ~24h since the job was marked complete, if they
// haven't reviewed yet. Sends once per booking (guarded by review_reminder_sent).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole.entities;

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const completed = await svc.Booking.filter({ status: 'completed', review_reminder_sent: false }, '-updated_date', 200);
    const due = completed.filter((b) => b.updated_date && new Date(b.updated_date) <= dayAgo);

    let reminded = 0;
    for (const b of due) {
      const [buyerReviews, teenReviews] = await Promise.all([
        svc.Review.filter({ booking_id: b.id, direction: 'buyer_to_teen' }),
        svc.Review.filter({ booking_id: b.id, direction: 'teen_to_buyer' }),
      ]);

      if (buyerReviews.length === 0) {
        await svc.Notification.create({
          user_id: b.buyer_user_id,
          type: 'review',
          title: 'Leave a review',
          body: `How did it go with ${b.teen_display_name} on "${b.listing_title}"? Leave a quick review.`,
          link: `/bookings/${b.id}`,
          read: false,
        });
      }
      if (teenReviews.length === 0) {
        await svc.Notification.create({
          user_id: b.teen_user_id,
          type: 'review',
          title: 'Leave a review',
          body: `How was working with ${b.buyer_name} on "${b.listing_title}"? Leave a quick review.`,
          link: `/bookings/${b.id}`,
          read: false,
        });
      }
      await svc.Booking.update(b.id, { review_reminder_sent: true });
      reminded += 1;
    }

    return Response.json({ success: true, reminded });
  } catch (error) {
    console.error('sendReviewReminders error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});