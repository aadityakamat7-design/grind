import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import RatingStars from "@/components/grind/RatingStars";

export default function ReviewDialog({ open, onOpenChange, booking, author, direction, onDone }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const subjectId = direction === "buyer_to_teen" ? booking.teen_user_id : booking.buyer_user_id;
  const subjectName = direction === "buyer_to_teen" ? booking.teen_display_name : booking.buyer_name;

  const submit = async () => {
    setSaving(true);
    await base44.entities.Review.create({
      booking_id: booking.id,
      author_id: author.id,
      author_name: direction === "buyer_to_teen" ? booking.buyer_name : booking.teen_display_name,
      subject_id: subjectId,
      direction,
      rating,
      text,
    });
    if (direction === "buyer_to_teen") {
      const profiles = await base44.entities.TeenProfile.filter({ user_id: booking.teen_user_id });
      const profile = profiles[0];
      if (profile) {
        const count = (profile.review_count || 0) + 1;
        const avg = ((profile.avg_rating || 0) * (profile.review_count || 0) + rating) / count;
        await base44.entities.TeenProfile.update(profile.id, {
          avg_rating: Math.round(avg * 10) / 10,
          review_count: count,
        });
      }
    }
    setSaving(false);
    onOpenChange(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle>Review {subjectName}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center py-2">
          <RatingStars rating={rating} size="w-8 h-8" onSelect={setRating} />
        </div>
        <Textarea
          placeholder="How did it go?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="rounded-xl"
        />
        <Button disabled={!rating || saving} onClick={submit} className="rounded-xl w-full">
          {saving ? "Submitting..." : "Submit review"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}