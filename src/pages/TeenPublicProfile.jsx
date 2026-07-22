import React, { useState, useEffect, useCallback } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Lock, MapPin, ShieldCheck } from "lucide-react";
import RatingStars from "@/components/grind/RatingStars";
import TrustBadge from "@/components/grind/TrustBadge";
import BookDialog from "@/components/grind/BookDialog";
import ReportButton from "@/components/grind/ReportButton";
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
    const [profiles, teenListings, teenReviews, buyers] = await Promise.all([
      base44.entities.TeenProfile.filter({ user_id: teenUserId }),
      base44.entities.Listing.filter({ teen_user_id: teenUserId, status: "published" }),
      base44.entities.Review.filter({ subject_id: teenUserId, direction: "buyer_to_teen" }, "-created_date", 20),
      base44.entities.BuyerProfile.filter({ user_id: user.id }),
    ]);
    setProfile(profiles[0] || null);
    setListings(teenListings);
    setReviews(teenReviews.filter((r) => !r.hidden));
    setBuyerProfile(buyers[0] || null);
    setLoading(false);
  }, [teenUserId, user.id]);

  useEffect(() => { load(); }, [load]);

  if (loading)
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" /></div>;

  if (!profile)
    return <p className="text-center text-slate-500 py-20">This teen's profile isn't available.</p>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center mx-auto text-white text-3xl font-extrabold">
          {profile.display_name?.charAt(0)}
        </div>
        <h1 className="text-xl font-extrabold text-slate-900 mt-3">{profile.display_name}</h1>
        <div className="flex justify-center mt-1.5">
          {profile.review_count > 0 ? (
            <RatingStars rating={profile.avg_rating} count={profile.review_count} />
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200 px-2.5 py-0.5 text-xs font-bold">
              ✨ New to Grind
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">{profile.bio}</p>
        <p className="text-xs text-slate-400 mt-2 flex items-center justify-center gap-1">
          <MapPin className="w-3 h-3" /> ZIP {profile.zip}
        </p>
        <div className="flex justify-center gap-2 mt-3 flex-wrap">
          <TrustBadge type="parent_approved" />
          {profile.parent_identity_verified && (
            <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border-blue-200">
              <ShieldCheck className="w-3 h-3" /> Parent identity verified
            </span>
          )}
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
            profile.is_available !== false ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${profile.is_available !== false ? "bg-emerald-500" : "bg-slate-400"}`} />
            {profile.is_available !== false ? "Available now" : "Busy"}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-3 flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" /> Contact info and exact addresses stay hidden until a booking is confirmed.
        </p>
        <div className="mt-3 flex items-center justify-center gap-4">
          <SaveTeenButton buyer={user} teenUserId={profile.user_id} teenName={profile.display_name} />
          <ReportButton reporter={user} subjectId={profile.user_id} subjectName={profile.display_name} />
        </div>
      </div>

      {profile.skills?.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {profile.skills.map((s) => (
            <span key={s} className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">{s}</span>
          ))}
        </div>
      )}

      <div>
        <h2 className="font-bold text-slate-900 mb-3">Services</h2>
        <div className="space-y-3">
          {listings.map((l) => (
            <div key={l.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{CATEGORY_LABELS[l.category]}</p>
                  <h3 className="font-bold text-slate-900 mt-0.5">{l.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{l.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-extrabold text-slate-900">{money(l.price)}</p>
                  <p className="text-[11px] text-slate-400">{l.price_model === "HOURLY" ? "per hour" : "fixed"}</p>
                </div>
              </div>
              <Button className="rounded-xl w-full mt-3" onClick={() => setBookingListing(l)}>
                Book this service
              </Button>
            </div>
          ))}
          {listings.length === 0 && <p className="text-sm text-slate-400">No published services right now.</p>}
        </div>
      </div>

      <div>
        <h2 className="font-bold text-slate-900 mb-3">Reviews</h2>
        {categoryAverages(reviews).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {categoryAverages(reviews).map((c) => (
              <span key={c.category} className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                {CATEGORY_LABELS[c.category] || c.category}
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {c.avg.toFixed(1)}
                <span className="text-slate-400 font-normal">({c.count})</span>
              </span>
            ))}
          </div>
        )}
        {reviews.length === 0 ? (
          <p className="text-sm text-slate-400">No reviews yet — complete your first job to start building your reputation.</p>
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