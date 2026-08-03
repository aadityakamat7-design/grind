import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { notifyAdmins } from '../../shared/notifyAdmins.ts';

// Creates a report for a review. Looks up the review author server-side
// so the client never needs the author's identity (anonymization). The
// Report entity is created with the real author_id for admin moderation.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { reviewId, reason, details } = await req.json();
    if (!reviewId || !reason) {
      return Response.json({ error: 'reviewId and reason required' }, { status: 400 });
    }

    const svc = base44.asServiceRole.entities;
    const review = await svc.Review.get(reviewId);
    if (!review) return Response.json({ error: 'Review not found' }, { status: 404 });
    if (review.author_id === user.id) {
      return Response.json({ error: 'Cannot report your own review' }, { status: 400 });
    }

    await svc.Report.create({
      reporter_id: user.id,
      reporter_name: user.full_name?.split(' ')[0] || 'User',
      subject_id: review.author_id,
      subject_name: review.author_name || 'Anonymous user',
      review_id: reviewId,
      reason,
      details: details || '',
      status: 'open',
    });

    await notifyAdmins(base44, {
      type: 'safety',
      title: 'New report filed',
      body: `A review was reported for "${reason}". Review it in the admin dashboard.`,
      link: '/admin',
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('reportReview error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});