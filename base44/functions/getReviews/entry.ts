import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Returns anonymized reviews. Strips author_id and author_name from the
// response — the caller only gets an is_mine flag (for edit/delete) and an
// author_label ("Verified Neighbor" / "Verified Teen"). Admins get the
// full raw review data for moderation. Reviews are fetched by subject_id
// (for profile pages) or booking_id (for booking detail).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { subject_id, booking_id, author_id, direction } = await req.json();
    const svc = base44.asServiceRole.entities;

    let reviews;
    if (booking_id) {
      reviews = await svc.Review.filter({ booking_id }, '-created_date', 100);
    } else if (author_id) {
      // Only return the caller's own reviews — never another user's.
      if (author_id !== user.id) {
        return Response.json({ error: 'Can only query your own reviews' }, { status: 403 });
      }
      const filter = { author_id: user.id };
      if (direction) filter.direction = direction;
      reviews = await svc.Review.filter(filter, '-created_date', 100);
    } else if (subject_id) {
      reviews = await svc.Review.filter({ subject_id }, '-created_date', 100);
    } else {
      return Response.json({ error: 'subject_id, booking_id, or author_id required' }, { status: 400 });
    }

    const isAdmin = user.app_role === 'admin';
    const visible = reviews.filter((r) => isAdmin || !r.hidden);

    const anonymized = visible.map((r) => {
      if (isAdmin) return r;
      const authorLabel = r.direction === 'buyer_to_teen' ? 'Verified Neighbor' : 'Verified Teen';
      return {
        id: r.id,
        booking_id: r.booking_id,
        subject_id: r.subject_id,
        direction: r.direction,
        rating: r.rating,
        text: r.text,
        tags: r.tags,
        category: r.category,
        reply_text: r.reply_text,
        reply_at: r.reply_at,
        edited_at: r.edited_at,
        created_date: r.created_date,
        hidden: r.hidden,
        author_label: authorLabel,
        is_mine: r.author_id === user.id,
      };
    });

    return Response.json({ reviews: anonymized });
  } catch (error) {
    console.error('getReviews error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});