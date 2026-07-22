import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BadgeCheck, Reply, Pencil } from "lucide-react";
import RatingStars from "@/components/grind/RatingStars";
import ReportButton from "@/components/grind/ReportButton";
import { CATEGORY_LABELS } from "@/lib/grind";
import { isReviewEditable, recomputeTeenRating, recomputeBuyerRating } from "@/lib/ratings";
import { maskPII } from "@/lib/grind";
import { format } from "date-fns";

const MAX_LENGTH = 500;

export default function ReviewCard({ review, viewer, onChanged }) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editRating, setEditRating] = useState(review.rating);
  const [editText, setEditText] = useState(review.text || "");
  const [saving, setSaving] = useState(false);

  const canReply = viewer?.id === review.subject_id && !review.reply_text;
  const canEdit = isReviewEditable(review, viewer?.id);

  const submitReply = async () => {
    setSaving(true);
    await base44.entities.Review.update(review.id, {
      reply_text: replyText.trim(),
      reply_at: new Date().toISOString(),
    });
    setSaving(false);
    setReplying(false);
    onChanged?.();
  };

  const submitEdit = async () => {
    setSaving(true);
    const { text: safeText } = maskPII(editText.trim(), false);
    await base44.entities.Review.update(review.id, {
      rating: editRating,
      text: safeText,
      edited_at: new Date().toISOString(),
    });
    if (review.direction === "buyer_to_teen") {
      await recomputeTeenRating(review.subject_id);
    } else {
      await recomputeBuyerRating(review.subject_id);
    }
    setSaving(false);
    setEditing(false);
    onChanged?.();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-bold text-slate-900 text-sm truncate">{review.author_name || "Neighbor"}</p>
          {review.booking_id && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold shrink-0">
              <BadgeCheck className="w-3 h-3" /> Verified job
            </span>
          )}
        </div>
        {!editing && <RatingStars rating={review.rating} />}
      </div>
      {review.category && (
        <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide mt-1">
          {CATEGORY_LABELS[review.category] || review.category}
        </p>
      )}

      {editing ? (
        <div className="mt-2 space-y-2">
          <RatingStars rating={editRating} size="w-6 h-6" onSelect={setEditRating} />
          <Textarea
            className="rounded-xl text-sm"
            value={editText}
            maxLength={MAX_LENGTH}
            onChange={(e) => setEditText(e.target.value)}
          />
          <p className="text-[11px] text-slate-400 text-right">{editText.length}/{MAX_LENGTH}</p>
          <div className="flex gap-2">
            <Button size="sm" className="rounded-xl" disabled={!editRating || saving} onClick={submitEdit}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
            <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          {review.text && <p className="text-sm text-slate-600 mt-1.5">{review.text}</p>}
          {review.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {review.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-600">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      <p className="text-[11px] text-slate-400 mt-2">
        {review.created_date ? format(new Date(review.created_date), "MMM d, yyyy") : ""}
        {review.edited_at && " · edited"}
      </p>

      {review.reply_text && (
        <div className="mt-3 bg-slate-50 rounded-xl p-3 border-l-2 border-blue-200">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Reply from the teen</p>
          <p className="text-sm text-slate-600 mt-1">{review.reply_text}</p>
          {review.reply_at && (
            <p className="text-[11px] text-slate-400 mt-1">{format(new Date(review.reply_at), "MMM d, yyyy")}</p>
          )}
        </div>
      )}

      {canReply && !replying && (
        <button onClick={() => setReplying(true)} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700">
          <Reply className="w-3.5 h-3.5" /> Reply publicly
        </button>
      )}
      {canReply && replying && (
        <div className="mt-3 space-y-2">
          <Textarea
            className="rounded-xl text-sm"
            placeholder="Thank your neighbor or add context — this reply is public."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" className="rounded-xl" disabled={!replyText.trim() || saving} onClick={submitReply}>
              {saving ? "Posting..." : "Post reply"}
            </Button>
            <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setReplying(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!editing && (
        <div className="mt-3 flex items-center gap-4">
          {canEdit && (
            <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          )}
          {viewer && viewer.id !== review.author_id && (
            <ReportButton
              reporter={viewer}
              subjectId={review.author_id}
              subjectName={review.author_name || "this reviewer"}
              bookingId={review.booking_id}
              reviewId={review.id}
              label="Report review"
            />
          )}
        </div>
      )}
    </div>
  );
}