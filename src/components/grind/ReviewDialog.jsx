import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2 } from "lucide-react";
import RatingStars from "@/components/grind/RatingStars";
import { recomputeTeenRating, recomputeBuyerRating } from "@/lib/ratings";
import { maskPII } from "@/lib/grind";
import { notify } from "@/lib/notify";

const MAX_LENGTH = 500;

const TEEN_TAGS = ["On time", "Friendly", "Did a great job"];
const BUYER_TAGS = ["Clear instructions", "Respectful", "Paid promptly"];

export default function ReviewDialog({ open, onOpenChange, booking, author, direction, onDone }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [tags, setTags] = useState([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const subjectId = direction === "buyer_to_teen" ? booking.teen_user_id : booking.buyer_user_id;
  const subjectName = direction === "buyer_to_teen" ? booking.teen_display_name : booking.buyer_name;
  const chips = direction === "buyer_to_teen" ? TEEN_TAGS : BUYER_TAGS;

  const toggleTag = (tag) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const submit = async () => {
    setSaving(true);
    // Guard against a duplicate review for this booking/author (race-safe best effort).
    const existing = await base44.entities.Review.filter({ booking_id: booking.id, author_id: author.id });
    if (existing.length > 0) {
      setSaving(false);
      setDone(true);
      onDone?.();
      return;
    }
    let category;
    if (direction === "buyer_to_teen" && booking.listing_id) {
      const listings = await base44.entities.Listing.filter({ id: booking.listing_id });
      category = listings[0]?.category;
    }
    const { text: safeText } = maskPII(text.trim(), false);
    await base44.entities.Review.create({
      booking_id: booking.id,
      author_id: author.id,
      author_name: direction === "buyer_to_teen" ? booking.buyer_name : booking.teen_display_name,
      subject_id: subjectId,
      direction,
      rating,
      text: safeText,
      tags,
      category,
    });
    if (direction === "buyer_to_teen") {
      await recomputeTeenRating(booking.teen_user_id);
    } else {
      await recomputeBuyerRating(booking.buyer_user_id);
    }
    await notify(subjectId, {
      type: "review",
      title: `New review from ${direction === "buyer_to_teen" ? booking.buyer_name : booking.teen_display_name}`,
      body: safeText ? safeText.slice(0, 100) : `You received a ${rating}-star review.`,
      link: direction === "buyer_to_teen" ? `/teens/${booking.teen_user_id}` : `/bookings/${booking.id}`,
    });
    setSaving(false);
    setDone(true);
    onDone?.();
  };

  const close = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-sm">
        {done ? (
          <div className="text-center py-4 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="font-bold text-slate-900">Review submitted</p>
            <p className="text-sm text-slate-500">Thanks for the feedback — it's now on {subjectName}'s profile.</p>
            <Button variant="outline" className="rounded-xl" onClick={close}>Close</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Review {subjectName}</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center py-2">
              <RatingStars rating={rating} size="w-8 h-8" onSelect={setRating} />
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {chips.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    tags.includes(tag)
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-200"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <Textarea
              placeholder="How did it go? (optional)"
              value={text}
              maxLength={MAX_LENGTH}
              onChange={(e) => setText(e.target.value)}
              className="rounded-xl"
            />
            <p className="text-[11px] text-slate-400 text-right -mt-2">{text.length}/{MAX_LENGTH}</p>
            <Button disabled={!rating || saving} onClick={submit} className="rounded-xl w-full">
              {saving ? "Submitting..." : "Submit review"}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}