import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Flag, CheckCircle2, XCircle, MessageSquare } from "lucide-react";
import DisputeReviewQueue from "@/components/grind/admin/DisputeReviewQueue";
import ReportRow from "@/components/grind/admin/ReportRow";
import { money } from "@/lib/grind";

export default function AdminDisputes({ bookings, reports, user, onReload }) {
  const [tab, setTab] = useState("disputes");
  const [acting, setActing] = useState(false);
  const [resolving, setResolving] = useState(null);
  const [note, setNote] = useState("");

  const disputed = useMemo(() => bookings.filter((b) => b.status === "disputed"), [bookings]);
  const openReports = useMemo(() => reports.filter((r) => r.status === "open").sort((a, b) => new Date(a.created_date) - new Date(b.created_date)), [reports]);
  const resolvedReports = useMemo(() => reports.filter((r) => r.status === "resolved"), [reports]);

  const resolve = async (report) => {
    setActing(true);
    await base44.entities.Report.update(report.id, { status: "resolved" });
    setActing(false);
    onReload?.();
  };

  const hideReview = async (report) => {
    setActing(true);
    await base44.entities.Review.update(report.review_id, { hidden: true });
    await base44.entities.Report.update(report.id, { status: "resolved" });
    setActing(false);
    onReload?.();
  };

  const resolveWithNote = async (report) => {
    setActing(true);
    await base44.entities.Report.update(report.id, { status: "resolved", details: `${report.details || ""}\n\n[Admin note: ${note}]` });
    setNote("");
    setResolving(null);
    setActing(false);
    onReload?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border">
        <button onClick={() => setTab("disputes")} className={`px-3 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${tab === "disputes" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
          <ShieldAlert className="w-4 h-4 inline mr-1.5" /> Disputed jobs ({disputed.length})
        </button>
        <button onClick={() => setTab("safety")} className={`px-3 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${tab === "safety" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
          <Flag className="w-4 h-4 inline mr-1.5" /> Safety reports ({openReports.length} open)
        </button>
        <button onClick={() => setTab("resolved")} className={`px-3 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${tab === "resolved" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
          <CheckCircle2 className="w-4 h-4 inline mr-1.5" /> Resolved ({resolvedReports.length})
        </button>
      </div>

      {tab === "disputes" && <DisputeReviewQueue bookings={bookings} onDone={onReload} />}

      {tab === "safety" && (
        <div className="space-y-3">
          {openReports.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-6 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No open safety reports.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {openReports.map((r) => (
                <div key={r.id} className="bg-card rounded-2xl border border-amber-200 shadow-soft p-4 space-y-3">
                  <ReportRow report={r} onResolve={resolve} onHideReview={hideReview} acting={acting} />
                  {resolving === r.id ? (
                    <div className="space-y-2">
                      <Textarea className="rounded-xl text-sm" placeholder="Log a note about the outcome…" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { setResolving(null); setNote(""); }}>Cancel</Button>
                        <Button size="sm" className="rounded-xl" disabled={!note.trim() || acting} onClick={() => resolveWithNote(r)}>Resolve with note</Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" className="rounded-xl text-xs" onClick={() => setResolving(r.id)}>
                      <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Add resolution note
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "resolved" && (
        <div className="space-y-3">
          {resolvedReports.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">No resolved reports.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {resolvedReports.map((r) => (
                <div key={r.id} className="bg-card rounded-2xl border border-border shadow-soft p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm capitalize">{r.reason} · {r.subject_name || "—"}</p>
                      <p className="text-xs text-muted-foreground mt-1">{r.details?.slice(0, 200) || "No details"}</p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}