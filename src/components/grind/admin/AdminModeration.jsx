import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Flag, MessageSquare, Star, Check, X, BadgeCheck, Eye, EyeOff } from "lucide-react";
import CredentialReviewQueue from "@/components/grind/admin/CredentialReviewQueue";

export default function AdminModeration({ reviews, messages, credentials, onReload }) {
  const [tab, setTab] = useState("reviews");
  const [acting, setActing] = useState("");

  // Flagged reviews: low ratings (1-2 stars) or hidden ones, sorted by newest
  const flaggedReviews = useMemo(() =>
    reviews.filter((r) => r.rating <= 2 || r.hidden).sort((a, b) => new Date(b.created_date) - new Date(a.created_date)),
  [reviews]);

  const toggleHidden = async (review) => {
    setActing(review.id);
    try {
      await base44.entities.Review.update(review.id, { hidden: !review.hidden });
      onReload?.();
    } catch (err) { console.error("toggle review:", err); }
    setActing("");
  };

  const removeReview = async (review) => {
    setActing(review.id + "del");
    try {
      await base44.entities.Review.update(review.id, { hidden: true });
      onReload?.();
    } catch (err) { console.error("remove review:", err); }
    setActing("");
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border">
        <button onClick={() => setTab("reviews")} className={`px-3 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${tab === "reviews" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
          <Star className="w-4 h-4 inline mr-1.5" /> Flagged reviews ({flaggedReviews.length})
        </button>
        <button onClick={() => setTab("messages")} className={`px-3 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${tab === "messages" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
          <MessageSquare className="w-4 h-4 inline mr-1.5" /> Flagged messages ({messages.length})
        </button>
        <button onClick={() => setTab("credentials")} className={`px-3 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${tab === "credentials" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
          <BadgeCheck className="w-4 h-4 inline mr-1.5" /> Credentials ({credentials.length})
        </button>
      </div>

      {tab === "reviews" && (
        <div className="space-y-3">
          {flaggedReviews.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-6 text-center">
              <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No flagged reviews.</p>
            </div>
          ) : (
            flaggedReviews.map((r) => (
              <div key={r.id} className={`bg-card rounded-2xl border shadow-soft p-4 space-y-3 ${r.hidden ? "border-border opacity-60" : "border-amber-200"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "text-amber-400 fill-amber-400" : "text-border"}`} />)}</div>
                      {r.hidden && <span className="text-xs font-bold text-destructive">HIDDEN</span>}
                    </div>
                    <p className="text-sm text-foreground">{r.text || "(no text)"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{r.author_name} → {r.subject_id?.slice(0, 8)}… · {r.category || "—"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="rounded-xl text-xs" disabled={acting === r.id} onClick={() => toggleHidden(r)}>
                    {r.hidden ? <><Eye className="w-3.5 h-3.5 mr-1.5" /> Unhide</> : <><EyeOff className="w-3.5 h-3.5 mr-1.5" /> Hide</>}
                  </Button>
                  <Button size="sm" variant="destructive" className="rounded-xl text-xs" disabled={acting === r.id + "del"} onClick={() => removeReview(r)}>
                    <X className="w-3.5 h-3.5 mr-1.5" /> Remove
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "messages" && (
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-6 text-center">
              <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No flagged messages.</p>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="bg-card rounded-2xl border border-amber-200 shadow-soft p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">{m.sender_name || m.sender_id?.slice(0, 8)}</p>
                  {m.pii_masked && <span className="text-xs font-bold text-amber-600">PII masked</span>}
                </div>
                <p className="text-sm text-foreground">{m.body}</p>
                <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={async () => { await base44.entities.Message.update(m.id, { flagged: false }); onReload?.(); }}>
                  <Check className="w-3.5 h-3.5 mr-1.5" /> Clear flag
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "credentials" && <CredentialReviewQueue credentials={credentials} onDone={onReload} />}
    </div>
  );
}