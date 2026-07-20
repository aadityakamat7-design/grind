// Rating helpers — teen ratings are always recomputed from the full
// review set so averages never drift.
import { base44 } from "@/api/base44Client";

export async function recomputeTeenRating(teenUserId) {
  const reviews = await base44.entities.Review.filter(
    { subject_id: teenUserId, direction: "buyer_to_teen" },
    "-created_date",
    500
  );
  const profiles = await base44.entities.TeenProfile.filter({ user_id: teenUserId });
  const profile = profiles[0];
  if (!profile) return;
  const count = reviews.length;
  const avg = count === 0 ? 0 : reviews.reduce((s, r) => s + (r.rating || 0), 0) / count;
  await base44.entities.TeenProfile.update(profile.id, {
    avg_rating: Math.round(avg * 10) / 10,
    review_count: count,
  });
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