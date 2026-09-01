import React, { useState, useEffect, useCallback } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Lock, MapPin, Star } from "lucide-react";
import RatingStars from "@/components/grind/RatingStars";
import ReportButton from "@/components/grind/ReportButton";
import BlockButton from "@/components/grind/BlockButton";
import ReviewCard from "@/components/grind/ReviewCard";
import { CATEGORY_LABELS } from "@/lib/grind";
import { categoryAverages } from "@/lib/ratings";

export default function BuyerPublicProfile() {
  const { buyerUserId } = useParams();
  const { user } = useOutletContext();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [profileRes, reviewsRes] = await Promise.all([
        base44.functions.invoke("getBuyerProfile", { user_id: buyerUserId }),
        base44.functions.invoke("getReviews", { subject_id: buyerUserId }),
      ]);
      setProfile(profileRes.data?.profile || null);
      setReviews(reviewsRes.data?.reviews || []);
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't load this profile.");
    }
    setLoading(false);
  }, [buyerUserId]);

  useEffect(() => { load(); }, [load]);

  if (loading)
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" /></div>;

  if (error || !profile)
    return (
      <div className="text-center py-20 space-y-3">
        <p className="text-muted-foreground">{error || "This neighbor's profile isn't available."}</p>
        <Button variant="outline" className="rounded-xl" onClick={() => window.history.back()}>Go back</Button>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-2xl border border-border shadow-soft p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-foreground flex items-center justify-center mx-auto text-background text-3xl font-bold">
          {profile.full_name?.charAt(0)}
        </div>
        <h1 className="text-xl font-bold text-foreground mt-3">{profile.full_name}</h1>
        <div className="flex justify-center mt-1.5">
          {profile.review_count > 0 ? (
            <RatingStars rating={profile.avg_rating} count={profile.review_count} />
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary text-muted-foreground border border-border px-2.5 py-0.5 text-xs font-medium">
              ✨ New to Blockwork
            </span>
          )}
        </div>
        {profile.resolved_city && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
            <MapPin className="w-3 h-3" /> {profile.resolved_city}
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3 max-w-xs mx-auto">
          <div className="bg-secondary rounded-xl p-3">
            <p className="text-2xl font-bold text-foreground">{profile.jobs_completed || 0}</p>
            <p className="text-xs text-muted-foreground">Jobs completed</p>
          </div>
          <div className="bg-secondary rounded-xl p-3">
            <p className="text-2xl font-bold text-foreground">{profile.review_count || 0}</p>
            <p className="text-xs text-muted-foreground">Reviews</p>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3 flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" /> Address and contact info stay hidden until a booking is confirmed.
        </p>
        <div className="mt-3 flex items-center justify-center gap-4">
          <ReportButton reporter={user} subjectId={profile.user_id} subjectName={profile.full_name} />
          <BlockButton user={user} blockedId={profile.user_id} blockedName={profile.full_name} />
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-foreground mb-3">Reviews from teens</h2>
        {categoryAverages(reviews).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {categoryAverages(reviews).map((c) => (
              <span key={c.category} className="inline-flex items-center gap-1 rounded-full bg-card border border-border px-3 py-1 text-xs font-medium text-foreground">
                {CATEGORY_LABELS[c.category] || c.category}
                <Star className="w-3 h-3 fill-foreground text-foreground" />
                {c.avg.toFixed(1)}
                <span className="text-muted-foreground font-normal">({c.count})</span>
              </span>
            ))}
          </div>
        )}
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reviews yet — this neighbor hasn't completed a job yet.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} viewer={user} onChanged={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}