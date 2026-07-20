import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Star } from "lucide-react";
import ReviewDialog from "@/components/grind/ReviewDialog";

// Nudges a neighbor to review completed & paid bookings they haven't rated yet.
export default function ReviewNudge({ user, bookings }) {
  const [pending, setPending] = useState([]);
  const [reviewBooking, setReviewBooking] = useState(null);

  const load = useCallback(async () => {
    const candidates = bookings.filter((b) => b.status === "completed" && b.payment_status === "released");
    if (candidates.length === 0) {
      setPending([]);
      return;
    }
    const myReviews = await base44.entities.Review.filter({ author_id: user.id, direction: "buyer_to_teen" });
    const reviewedIds = new Set(myReviews.map((r) => r.booking_id));
    setPending(candidates.filter((b) => !reviewedIds.has(b.id)).slice(0, 2));
  }, [user.id, bookings]);

  useEffect(() => { load(); }, [load]);

  if (pending.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-3">
      <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
        <Star className="w-4 h-4 text-amber-500 fill-amber-400" /> How did it go?
      </p>
      {pending.map((b) => (
        <div key={b.id} className="flex items-center justify-between gap-3 bg-white rounded-xl p-3">
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 text-sm truncate">{b.listing_title}</p>
            <p className="text-xs text-slate-500">with {b.teen_display_name}</p>
          </div>
          <button
            onClick={() => setReviewBooking(b)}
            className="shrink-0 text-xs font-bold text-blue-600 hover:text-blue-700"
          >
            Leave a review →
          </button>
        </div>
      ))}
      {reviewBooking && (
        <ReviewDialog
          open={!!reviewBooking}
          onOpenChange={(v) => !v && setReviewBooking(null)}
          booking={reviewBooking}
          author={user}
          direction="buyer_to_teen"
          onDone={load}
        />
      )}
    </div>
  );
}