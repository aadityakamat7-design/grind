import React, { useState, useEffect, useCallback } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Lock, MapPin, ShieldCheck } from "lucide-react";
import RatingStars from "@/components/grind/RatingStars";
import TrustBadge from "@/components/grind/TrustBadge";
import BookDialog from "@/components/grind/BookDialog";
import ReportButton from "@/components/grind/ReportButton";
import BlockButton from "@/components/grind/BlockButton";
import SaveTeenButton from "@/components/grind/SaveTeenButton";
import ReviewCard from "@/components/grind/ReviewCard";
import { CATEGORY_LABELS, money } from "@/lib/grind";
import { categoryAverages } from "@/lib/ratings";
import { Star } from "lucide-react";

export default function TeenPublicProfile() {
  const { teenUserId } = useParams();
  const { user } = useOutletContext();
  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [buyerProfile, setBuyerProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingListing, setBookingListing] = useState(null);

  const load = useCallback(async () => {
    const [profiles, teenListings, reviewsRes, buyers] = await Promise.all([
      base44.entities.TeenProfile.filter({ user_id: teenUserId }),
      base44.entities.Listing.filter({ teen_user_id: teenUserId, status: "published" }),
      base44.functions.invoke("getReviews", { subject_id: teenUserId }),
      base44.entities.BuyerProfile.filter({ user_id: user.id }),
    ]);
    setProfile(profiles[0] || null);
    setListings(teenListings);
    setReviews(reviewsRes.data?.reviews || []);
    setBuyerProfile(buyers[0] || null);
    setLoading(false);
  }, [teenUserId, user.id]);

  useEffect(() => { load(); }, [load]);

  if (loading)
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" /></div>;

  if (!profile)
    return <p className="text-center text-muted-foreground py-20">This teen's profile isn't available.</p>;

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-2xl border border-border shadow-soft p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-foreground flex items-center justify-center mx-auto text-background text-3xl font-bold">
          {profile.display_name?.charAt(0)}
        </div>
        <h1 className="text-xl font-bold text-foreground mt-3 truncate">{profile.display_name}</h1>
        <div className="flex justify-center mt-1.5">
          {profile.review_count > 0 ? (
            <RatingStars rating={profile.avg_rating} count={profile.review_count} />
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary text-muted-foreground border border-border px-2.5 py-0.5 text-xs font-medium">
              ✨ New to Kickstart
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto line-clamp-4">{profile.bio}</p>
        <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
          <MapPin className="w-3 h-3" /> {profile.resolved_city || profile.state}
        </p>
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
        <div className="flex justify-center gap-2 mt-3 flex-wrap">
          <TrustBadge type="parent_approved" />
          {profile.parent_identity_verified && (
            <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium bg-secondary text-muted-foreground border-border">
              <ShieldCheck className="w-3 h-3" /> Parent identity verified
            </span>
          )}
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
            profile.is_available !== false ? "bg-foreground text-background border-foreground" : "bg-muted text-muted-foreground border-border"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${profile.is_available !== false ? "bg-background" : "bg-muted-foreground"}`} />
            {profile.is_available !== false ? "Available now" : "Busy"}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3 flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" /> Contact info and exact addresses stay hidden until a booking is confirmed.
        </p>
        <div className="mt-3 flex items-center justify-center gap-4">
          <SaveTeenButton buyer={user} teenUserId={profile.user_id} teenName={profile.display_name} />
          <ReportButton reporter={user} subjectId={profile.user_id} subjectName={profile.display_name} />
          <BlockButton user={user} blockedId={profile.user_id} blockedName={profile.display_name} />
        </div>
      </div>

      {profile.skills?.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {profile.skills.map((s) => (
            <span key={s} className="px-3 py-1 rounded-full bg-secondary text-muted-foreground text-xs font-medium">{s}</span>
          ))}
        </div>
      )}

      <div>
        <h2 className="font-semibold text-foreground mb-3">Services</h2>
        <div className="space-y-3">
          {listings.map((l) => (
            <div key={l.id} className="bg-card rounded-2xl border border-border shadow-soft p-4">
              {l.is_hazard_flagged && (
                <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-2.5 mb-3 text-xs text-destructive">
                  <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                  <span><span className="font-semibold">Safety warning:</span> {l.hazard_reason || "This service was flagged for safety review."}</span>
                </div>
              )}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{CATEGORY_LABELS[l.category]}</p>
                  <h3 className="font-semibold text-foreground mt-0.5 truncate">{l.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{l.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-foreground">{money(l.price)}</p>
                  <p className="text-[11px] text-muted-foreground">{l.price_model === "HOURLY" ? "per hour" : "fixed"}</p>
                </div>
              </div>
              <Button className="rounded-xl w-full mt-3" onClick={() => setBookingListing(l)}>
                Book this service
              </Button>
            </div>
          ))}
          {listings.length === 0 && <p className="text-sm text-muted-foreground">No published services right now.</p>}
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-foreground mb-3">Reviews</h2>
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
          <p className="text-sm text-muted-foreground">No reviews yet — complete your first job to start building your reputation.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} viewer={user} onChanged={load} />
            ))}
          </div>
        )}
      </div>

      {bookingListing && (
        <BookDialog
          open={!!bookingListing}
          onOpenChange={(v) => !v && setBookingListing(null)}
          listing={bookingListing}
          buyer={user}
          buyerProfile={buyerProfile}
        />
      )}
    </div>
  );
}