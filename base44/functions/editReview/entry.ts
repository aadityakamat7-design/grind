import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { recomputeSubjectRating } from '../../shared/reviewRatings.ts';

const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

// Server-side review edit with rating bounds enforcement (1-5 integer).
// RLS locks Review.update to admin-only, so this function is the only path
// for authors to edit their own rating/text within the 24h window.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { reviewId, rating, text } = await req.json();
    if (!reviewId) return Response.json({ error: 'reviewId is required' }, { status: 400 });

    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return Response.json({ error: 'Rating must be a whole number from 1 to 5.' }, { status: 400 });
    }

    const svc = base44.asServiceRole.entities;
    const review = await svc.Review.get(reviewId);
    if (!review) return Response.json({ error: 'Review not found' }, { status: 404 });
    if (review.author_id !== user.id) {
      return Response.json({ error: 'You can only edit your own review.' }, { status: 403 });
    }
    if (review.hidden) return Response.json({ error: 'This review is no longer editable.' }, { status: 400 });
    if (!review.created_date || Date.now() - new Date(review.created_date).getTime() >= EDIT_WINDOW_MS) {
      return Response.json({ error: 'The 24-hour edit window has passed.' }, { status: 400 });
    }

    const safeText = (text || '').trim().slice(0, 500);
    await svc.Review.update(reviewId, {
      rating: r,
      text: safeText,
      edited_at: new Date().toISOString(),
    });

    await recomputeSubjectRating(svc, review.subject_id, review.direction);

    return Response.json({ updated: true });
  } catch (error) {
    console.error('editReview error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});