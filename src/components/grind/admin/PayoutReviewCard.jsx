import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, ChevronDown, ChevronUp, ShieldAlert, ShieldCheck, Shield, Loader2 } from "lucide-react";
import { money } from "@/lib/grind";

const RISK_STYLES = {
  low: { icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", label: "Low risk" },
  medium: { icon: Shield, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", label: "Medium risk" },
  high: { icon: ShieldAlert, color: "text-destructive", bg: "bg-red-50", border: "border-red-200", label: "High risk" },
};

const STATUS_BADGE = {
  pending: { label: "Pending", color: "text-amber-600 bg-amber-50" },
  auto_approved: { label: "Auto-cleared", color: "text-emerald-600 bg-emerald-50" },
  approved: { label: "Approved", color: "text-emerald-600 bg-emerald-50" },
  rejected: { label: "Rejected", color: "text-destructive bg-red-50" },
  blocked: { label: "Blocked", color: "text-destructive bg-red-50" },
  transferred: { label: "Transferred", color: "text-primary bg-primary/10" },
};

export default function PayoutReviewCard({ review, user, onDone }) {
  const [expanded, setExpanded] = useState(false);
  const [acting, setActing] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const risk = RISK_STYLES[review.risk_level] || RISK_STYLES.low;
  const RiskIcon = risk.icon;
  const statusBadge = STATUS_BADGE[review.status] || STATUS_BADGE.pending;
  const isPending = review.status === "pending";
  const isBlocked = review.status === "blocked";

  const approve = async () => {
    setActing("approve");
    try {
      await base44.entities.PayoutReview.update(review.id, {
        status: "approved",
        reviewed_by_id: user.id,
        reviewed_at: new Date().toISOString(),
        review_action: "approve",
      });
      const res = await base44.functions.invoke("processPayout", { bookingId: review.booking_id });
      if (res.data?.error) {
        console.error("Transfer failed:", res.data.error);
      }
      onDone?.();
    } catch (err) {
      console.error("Approve failed:", err);
    }
    setActing(null);
  };

  const reject = async () => {
    if (!rejectNote.trim()) return;
    setActing("reject");
    try {
      await base44.entities.PayoutReview.update(review.id, {
        status: "rejected",
        reviewed_by_id: user.id,
        reviewed_at: new Date().toISOString(),
        review_action: "reject",
        review_note: rejectNote.trim(),
      });
      onDone?.();
    } catch (err) {
      console.error("Reject failed:", err);
    }
    setActing(null);
    setRejecting(false);
    setRejectNote("");
  };

  return (
    <div className={`rounded-2xl border ${risk.border} ${risk.bg} shadow-soft p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <RiskIcon className={`w-4 h-4 ${risk.color}`} />
            <span className={`text-xs font-bold ${risk.color}`}>{risk.label}</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadge.color}`}>{statusBadge.label}</span>
            {review.is_first_payout && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">First payout</span>}
            {review.audit_mode && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Audit</span>}
          </div>
          <p className="font-bold text-foreground text-sm truncate">{review.listing_title || "Untitled job"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {money(review.amount)} · {review.is_critical ? "Critical failure" : `${review.flags?.length || 0} flag${review.flags?.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {(isPending || isBlocked) && (
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" className="rounded-full" disabled={acting !== null} onClick={approve}>
              {acting === "approve" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Approve
            </Button>
            <Button size="sm" variant="outline" className="rounded-full text-destructive border-destructive/30" disabled={acting !== null} onClick={() => setRejecting(!rejecting)}>
              <X className="w-3.5 h-3.5" />
              Reject
            </Button>
          </div>
        )}
      </div>

      {review.flags?.length > 0 && (
        <div className="mt-2 space-y-1">
          {review.flags.map((f, i) => (
            <div key={i} className="text-xs text-destructive flex items-start gap-1.5">
              <span className="font-bold">•</span> {f}
            </div>
          ))}
        </div>
      )}

      {rejecting && (
        <div className="mt-3 space-y-2">
          <Textarea
            placeholder="Reason for rejection (required)..."
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            className="text-sm"
            rows={2}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" className="rounded-full" disabled={!rejectNote.trim() || acting === "reject"} onClick={reject}>
              {acting === "reject" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm reject"}
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full" onClick={() => { setRejecting(false); setRejectNote(""); }}>Cancel</Button>
          </div>
        </div>
      )}

      <button
        className="text-xs text-muted-foreground mt-2 flex items-center gap-1 hover:text-foreground"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? "Hide" : "Show"} check details ({review.checks?.length || 0})
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5">
          {review.checks?.map((c, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              {c.passed ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <X className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-medium text-foreground">{c.name.replace(/_/g, " ")}</span>
                {!c.passed && c.reason && <p className="text-muted-foreground mt-0.5">{c.reason}</p>}
              </div>
            </div>
          ))}
          {review.reviewed_at && (
            <div className="pt-2 mt-2 border-t border-border text-xs text-muted-foreground">
              Reviewed {new Date(review.reviewed_at).toLocaleDateString()} · action: {review.review_action}
              {review.review_note && <p className="mt-1">Note: {review.review_note}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}