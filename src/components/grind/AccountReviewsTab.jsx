import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Star } from "lucide-react";
import ReviewCard from "@/components/grind/ReviewCard";
import RatingStars from "@/components/grind/RatingStars";
import ErrorRetry from "@/components/grind/ErrorRetry";

// Shows the reviews others have written about this user (their reputation),
// with a rating summary at the top. Reuses the same ReviewCard used on
// booking detail and public profiles.
export default function AccountReviewsTab({ user }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const res = await base44.functions.invoke("getReviews", { subject_id: user.id });
      setReviews(res.data?.reviews || []);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  if (loading)
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border h-28 skeleton-shimmer" />
        ))}
      </div>
    );
  if (error) return <ErrorRetry onRetry={load} />;

  const avg = reviews.length
    ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length
    : 0;

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl border border-border shadow-soft p-5 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Star className="w-7 h-7 fill-amber text-amber" />
          <span className="text-3xl font-extrabold text-foreground">{avg.toFixed(1)}</span>
        </div>
        <div>
          <RatingStars rating={Math.round(avg)} />
          <p className="text-xs text-muted-foreground mt-1">
            {reviews.length} review{reviews.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border shadow-soft p-8 text-center">
          <p className="text-sm font-semibold text-foreground">No reviews yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Reviews from completed jobs will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} viewer={user} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}