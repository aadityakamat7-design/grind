import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { recomputeSubjectRating } from '../../shared/reviewRatings.ts';

// Server-side review creation with rating bounds enforcement (1-5 integer).
// RLS locks Review.create to admin-only, so this function is the only path.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookingId, direction, rating, text, tags } = await req.json();
    if (!bookingId || !direction) {
      return Response.json({ error: 'bookingId and direction are required' }, { status: 400 });
    }

    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return Response.json({ error: 'Rating must be a whole number from 1 to 5.' }, { status: 400 });
    }

    const svc = base44.asServiceRole.entities;
    const booking = await svc.Booking.get(bookingId);
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

    const isBuyerToTeen = direction === 'buyer_to_teen';
    const subjectId = isBuyerToTeen ? booking.teen_user_id : booking.buyer_user_id;
    const authorName = isBuyerToTeen ? booking.buyer_name : booking.teen_display_name;

    // Duplicate guard
    const existing = await svc.Review.filter({ booking_id: bookingId, author_id: user.id });
    if (existing.length > 0) return Response.json({ duplicate: true });

    // Category from listing
    let category;
    if (isBuyerToTeen && booking.listing_id) {
      const listings = await svc.Listing.filter({ id: booking.listing_id });
      category = listings[0]?.category;
    }

    const safeText = (text || '').trim().slice(0, 500);

    await svc.Review.create({
      booking_id: bookingId,
      author_id: user.id,
      author_name: authorName,
      subject_id: subjectId,
      direction,
      rating: r,
      text: safeText,
      tags: Array.isArray(tags) ? tags : [],
      category,
    });

    await recomputeSubjectRating(svc, subjectId, direction);

    await svc.Notification.create({
      user_id: subjectId,
      type: 'review',
      title: `New review from ${authorName}`,
      body: safeText ? safeText.slice(0, 100) : `You received a ${r}-star review.`,
      link: isBuyerToTeen ? `/teens/${booking.teen_user_id}` : `/bookings/${bookingId}`,
    });

    return Response.json({ submitted: true });
  } catch (error) {
    console.error('submitReview error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});