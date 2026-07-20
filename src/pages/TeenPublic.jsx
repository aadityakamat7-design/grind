import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, useOutletContext, useNavigate } from "react-router-dom";
import { categoryLabel, money } from "@/lib/grind";
import TrustBadge from "@/components/grind/TrustBadge";
import BookDialog from "@/components/booking/BookDialog";
import { Button } from "@/components/ui/button";
import { Star, Lock, ArrowLeft } from "lucide-react";

export default function TeenPublic() {
  const { teenUserId } = useParams();
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [teen, setTeen] = useState(null);
  const [listings, setListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [parentUserId, setParentUserId] = useState(null);
  const [buyerProfile, setBuyerProfile] = useState(null);
  const [bookListing, setBookListing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [profiles, ls, rvs, links, buyers] = await Promise.all([
        base44.entities.TeenProfile.filter({ created_by_id: teenUserId }),
        base44.entities.Listing.filter({ teen_user_id: teenUserId, status: "published" }),
        base44.entities.Review.filter({ subject_user_id: teenUserId, direction: "buyer_to_teen", status: "visible" }, "-created_date", 20),
        base44.entities.ParentTeenLink.filter({ teen_user_id: teenUserId, status: "confirmed" }),
        base44.entities.BuyerProfile.filter({ created_by_id: user.id }),
      ]);
      setTeen(profiles[0] || null);
      setListings(ls);
      setReviews(rvs);
      setParentUserId(links[0]?.parent_user_id || null);
      setBuyerProfile(buyers[0] || null);
      setLoading(false);
    })();
  }, [teenUserId, user.id]);

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  if (!teen) return <div className="py-20 text-center text-muted-foreground">Teen not found.</div>;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-14 h-14 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center font-display font-extrabold text-xl">
            {teen.display_name?.[0]}
          </div>
          <div>
            <h1 className="font-display text-xl font-extrabold">{teen.display_name}</h1>
            {teen.review_count > 0 && (
              <div className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-semibold">{teen.avg_rating?.toFixed(1)}</span>
                <span className="text-muted-foreground">({teen.review_count} reviews)</span>
              </div>
            )}
          </div>
        </div>
        {teen.bio && <p className="text-sm text-muted-foreground mb-3">{teen.bio}</p>}
        <div className="flex flex-wrap gap-2">
          <TrustBadge type="parent_approved" />
        </div>
        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
          <Lock className="w-3 h-3" /> Contact details are only shared after a booking is parent-approved.
        </p>
      </div>

      <section>
        <h2 className="font-heading font-bold mb-3">Services</h2>
        <div className="space-y-3">
          {listings.map((l) => (
            <div key={l.id} className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">{categoryLabel(l.category)}</div>
                  <div className="font-heading font-bold">{l.title}</div>
                  <p className="text-sm text-muted-foreground mt-1">{l.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display font-extrabold">{money(l.price)}</div>
                  <div className="text-xs text-muted-foreground">{l.price_model === "HOURLY" ? "/hour" : "fixed"}</div>
                </div>
              </div>
              {user.app_role === "buyer" && (
                <Button className="w-full mt-4 rounded-full" onClick={() => setBookListing(l)}>
                  Book this service
                </Button>
              )}
            </div>
          ))}
          {listings.length === 0 && <p className="text-sm text-muted-foreground">No published services yet.</p>}
        </div>
      </section>

      {reviews.length > 0 && (
        <section>
          <h2 className="font-heading font-bold mb-3">Reviews</h2>
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
                    ))}
                  </span>
                  <span className="text-xs text-muted-foreground">{r.author_name}</span>
                </div>
                <p className="text-sm">{r.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <BookDialog
        open={!!bookListing}
        onOpenChange={(o) => !o && setBookListing(null)}
        listing={bookListing}
        teen={teen}
        buyerName={buyerProfile?.full_name || user.full_name}
        buyerUserId={user.id}
        parentUserId={parentUserId}
        onBooked={() => navigate("/bookings")}
      />
    </div>
  );
}