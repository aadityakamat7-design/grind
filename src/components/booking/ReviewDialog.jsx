import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";

export default function ReviewDialog({ open, onOpenChange, booking, user, direction, onDone }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const subjectId = direction === "buyer_to_teen" ? booking?.teen_user_id : booking?.buyer_user_id;
  const subjectName = direction === "buyer_to_teen" ? booking?.teen_display_name : booking?.buyer_name;

  const submit = async () => {
    if (!rating) return;
    setSaving(true);
    await base44.entities.Review.create({
      booking_id: booking.id,
      author_user_id: user.id,
      author_name: direction === "buyer_to_teen" ? booking.buyer_name : booking.teen_display_name,
      subject_user_id: subjectId,
      direction,
      rating,
      text,
      status: "visible",
    });

    if (direction === "buyer_to_teen") {
      const profiles = await base44.entities.TeenProfile.filter({ created_by_id: booking.teen_user_id });
      const p = profiles[0];
      if (p) {
        const count = (p.review_count || 0) + 1;
        const avg = ((p.avg_rating || 0) * (p.review_count || 0) + rating) / count;
        await base44.entities.TeenProfile.update(p.id, { avg_rating: Math.round(avg * 10) / 10, review_count: count });
      }
      await base44.entities.Notification.create({
        user_id: booking.teen_user_id,
        title: `New ${rating}-star review ⭐`,
        body: `${booking.buyer_name} reviewed "${booking.listing_title}".`,
        type: "app",
      });
    }
    setSaving(false);
    onOpenChange(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Review {subjectName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} onClick={() => setRating(i)}>
                <Star className={`w-8 h-8 transition-colors ${i <= rating ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
              </button>
            ))}
          </div>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="How did it go?" />
          <Button className="w-full rounded-full" onClick={submit} disabled={!rating || saving}>
            {saving ? "Posting…" : "Post review"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}