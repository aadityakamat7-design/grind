import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Loader2, Play, History, Filter, CheckCheck } from "lucide-react";
import PayoutReviewCard from "@/components/grind/admin/PayoutReviewCard";
import { money } from "@/lib/grind";

export default function PayoutReviewQueue({ bookings, onDone, user }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [riskFilter, setRiskFilter] = useState("all");
  const [batchRunning, setBatchRunning] = useState(false);
  const [auditRunning, setAuditRunning] = useState(false);
  const [batchResult, setBatchResult] = useState(null);
  const [auditResult, setAuditResult] = useState(null);
  const [bulkApproving, setBulkApproving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const all = await base44.entities.PayoutReview.list("-created_date", 500);
      setReviews(all);
    } catch (err) {
      console.error("Failed to load payout reviews:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = base44.entities.PayoutReview.subscribe(() => load());
    return unsub;
  }, [load]);

  const pendingBookings = bookings.filter((b) => b.payout_status === "pending_review");

  // Pending reviews (status pending or blocked) that need admin action
  const actionNeeded = reviews.filter((r) => r.status === "pending" || r.status === "blocked");
  // Completed reviews (audit log)
  const auditLog = reviews.filter((r) => ["approved", "rejected", "auto_approved", "transferred"].includes(r.status));

  const filtered = (tab === "pending" ? actionNeeded : auditLog).filter((r) => {
    if (riskFilter === "all") return true;
    return r.risk_level === riskFilter;
  });

  const lowRiskPending = actionNeeded.filter((r) => r.risk_level === "low" && !r.is_critical);

  const runBatch = async () => {
    setBatchRunning(true);
    setBatchResult(null);
    try {
      const res = await base44.functions.invoke("reviewPayoutsBatch", {});
      setBatchResult(res.data);
      await load();
      onDone?.();
    } catch (err) {
      console.error("Batch review failed:", err);
    }
    setBatchRunning(false);
  };

  const runAudit = async () => {
    setAuditRunning(true);
    setAuditResult(null);
    try {
      const res = await base44.functions.invoke("reviewPayoutsAudit", {});
      setAuditResult(res.data);
      await load();
    } catch (err) {
      console.error("Audit failed:", err);
    }
    setAuditRunning(false);
  };

  const bulkApprove = async () => {
    setBulkApproving(true);
    for (const r of lowRiskPending) {
      try {
        await base44.entities.PayoutReview.update(r.id, {
          status: "approved",
          reviewed_by_id: user.id,
          reviewed_at: new Date().toISOString(),
          review_action: "approve",
        });
        await base44.functions.invoke("processPayout", { bookingId: r.booking_id });
      } catch (err) {
        console.error("Bulk approve failed for", r.id, err);
      }
    }
    setBulkApproving(false);
    load();
    onDone?.();
  };

  const totalHeld = money(actionNeeded.reduce((s, r) => s + (r.amount || 0), 0));

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="font-bold text-foreground flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-500" />
          Payout review agent
          {actionNeeded.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">· {actionNeeded.length} waiting · {totalHeld} held</span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="rounded-full" disabled={batchRunning} onClick={runBatch}>
            {batchRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Review all pending
          </Button>
          <Button size="sm" variant="outline" className="rounded-full" disabled={auditRunning} onClick={runAudit}>
            {auditRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <History className="w-3.5 h-3.5" />}
            Retroactive audit
          </Button>
        </div>
      </div>

      {batchResult && (
        <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/20 text-sm">
          <p className="font-semibold text-foreground">Batch review complete</p>
          <p className="text-muted-foreground mt-1">
            {batchResult.reviewed} reviewed · {batchResult.cleared} cleared · {batchResult.held} held · {batchResult.blocked} blocked
          </p>
          {batchResult.critical_failures?.length > 0 && (
            <p className="text-destructive mt-1 font-medium">🚨 {batchResult.critical_failures.length} critical failure(s) — see queue below</p>
          )}
        </div>
      )}

      {auditResult && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm">
          <p className="font-semibold text-foreground">Retroactive audit complete</p>
          <p className="text-muted-foreground mt-1">
            {auditResult.total_audited} audited · {auditResult.would_clear} would clear · {auditResult.would_hold} would hold · {auditResult.would_block} would block
          </p>
          {auditResult.flagged?.length > 0 && (
            <div className="mt-2 space-y-1">
              {auditResult.flagged.slice(0, 10).map((f, i) => (
                <p key={i} className="text-xs text-destructive">
                  • "{f.title}" ({money(f.amount)}) — {f.flags.join("; ")} {f.transferred && "⚠️ already transferred"}
                </p>
              ))}
              {auditResult.flagged.length > 10 && <p className="text-xs text-muted-foreground">...and {auditResult.flagged.length - 10} more</p>}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-3 border-b border-border">
        <button
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "pending" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          onClick={() => setTab("pending")}
        >
          Pending ({actionNeeded.length})
        </button>
        <button
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "audit" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          onClick={() => setTab("audit")}
        >
          Audit log ({auditLog.length})
        </button>
      </div>

      {/* Filters + bulk action */}
      {tab === "pending" && actionNeeded.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          {["all", "low", "medium", "high"].map((r) => (
            <button
              key={r}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${riskFilter === r ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              onClick={() => setRiskFilter(r)}
            >
              {r === "all" ? "All" : `${r.charAt(0).toUpperCase() + r.slice(1)} risk`}
            </button>
          ))}
          {lowRiskPending.length > 1 && (
            <Button size="sm" variant="outline" className="rounded-full ml-auto" disabled={bulkApproving} onClick={bulkApprove}>
              {bulkApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
              Bulk approve ({lowRiskPending.length} low-risk)
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {tab === "pending" ? "No payouts waiting for review." : "No review decisions yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((r) => (
            <PayoutReviewCard key={r.id} review={r} user={user} onDone={() => { load(); onDone?.(); }} />
          ))}
        </div>
      )}
    </div>
  );
}