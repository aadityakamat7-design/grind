import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Server-side review reply. RLS locks Review.update to admin-only, so this
// function is the only path for the reviewed person to post a public reply.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { reviewId, replyText } = await req.json();
    if (!reviewId) return Response.json({ error: 'reviewId is required' }, { status: 400 });
    if (!replyText || !replyText.trim()) {
      return Response.json({ error: 'Reply cannot be empty.' }, { status: 400 });
    }

    const svc = base44.asServiceRole.entities;
    const review = await svc.Review.get(reviewId);
    if (!review) return Response.json({ error: 'Review not found' }, { status: 404 });
    if (review.subject_id !== user.id) {
      return Response.json({ error: 'Only the reviewed person can reply.' }, { status: 403 });
    }
    if (review.reply_text) return Response.json({ error: 'A reply already exists.' }, { status: 400 });

    const safeReply = replyText.trim().slice(0, 500);
    await svc.Review.update(reviewId, {
      reply_text: safeReply,
      reply_at: new Date().toISOString(),
    });

    return Response.json({ replied: true });
  } catch (error) {
    console.error('replyToReview error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});