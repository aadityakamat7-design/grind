// Rating helpers — teen and neighbor rating averages are recomputed server-side
// (see base44/shared/reviewRatings.ts) so averages never drift. These client
// helpers handle edit-window checks and category breakdowns only.

const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

// A review can be edited by its author for 24h after submission, then it locks.
export function isReviewEditable(review, viewerId) {
  if (!review || review.hidden) return false;
  if (review.author_id !== viewerId) return false;
  if (!review.created_date) return false;
  return Date.now() - new Date(review.created_date).getTime() < EDIT_WINDOW_MS;
}

// Per-category averages from a list of buyer_to_teen reviews.
// Returns [{ category, avg, count }] sorted by count desc.
export function categoryAverages(reviews) {
  const byCat = {};
  for (const r of reviews) {
    if (!r.category) continue;
    if (!byCat[r.category]) byCat[r.category] = { sum: 0, count: 0 };
    byCat[r.category].sum += r.rating || 0;
    byCat[r.category].count += 1;
  }
  return Object.entries(byCat)
    .map(([category, { sum, count }]) => ({
      category,
      avg: Math.round((sum / count) * 10) / 10,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}