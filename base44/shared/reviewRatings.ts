// Recompute a subject's average rating from their visible reviews.
// Shared by submitReview and editReview so averages never drift.
export async function recomputeSubjectRating(svc, subjectId, direction) {
  const reviews = await svc.Review.filter({ subject_id: subjectId, direction }, '-created_date', 500);
  const visible = reviews.filter((r) => !r.hidden);
  const count = visible.length;
  const avg = count === 0 ? 0 : visible.reduce((s, r) => s + (r.rating || 0), 0) / count;
  const rounded = Math.round(avg * 10) / 10;
  if (direction === 'buyer_to_teen') {
    const profiles = await svc.TeenProfile.filter({ user_id: subjectId });
    if (profiles[0]) {
      await svc.TeenProfile.update(profiles[0].id, { avg_rating: rounded, review_count: count });
    }
  } else {
    const profiles = await svc.BuyerProfile.filter({ user_id: subjectId });
    if (profiles[0]) {
      await svc.BuyerProfile.update(profiles[0].id, { avg_rating: rounded, review_count: count });
    }
  }
}