import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flag, CheckCircle2 } from "lucide-react";

const REASONS = [
  { value: "safety", label: "Safety concern" },
  { value: "off_platform", label: "Asked to go off-platform" },
  { value: "inappropriate", label: "Inappropriate behavior" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" },
];

export default function ReportButton({ reporter, subjectId, subjectName, bookingId = "", reviewId = "", label = "Report" }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setSaving(true);
    const report = await base44.entities.Report.create({
      reporter_id: reporter.id,
      reporter_name: reporter.full_name?.split(" ")[0] || "User",
      subject_id: subjectId,
      subject_name: subjectName,
      booking_id: bookingId,
      review_id: reviewId,
      reason,
      details,
      status: "open",
    });
    try {
      await base44.functions.invoke("notifyReport", { reportId: report.id, subjectId, subjectName, reason });
    } catch {
      // Report was saved either way; admin notification is best-effort.
    }
    setSaving(false);
    setDone(true);
  };

  return (
    <>
      <button
        onClick={() => { setDone(false); setReason(""); setDetails(""); setOpen(true); }}
        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-rose-600 transition-colors"
      >
        <Flag className="w-3.5 h-3.5" /> {label}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Report {subjectName}</DialogTitle>
          </DialogHeader>
          {done ? (
            <div className="text-center py-4 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-sm text-slate-600">Thanks — our safety team will review this report.</p>
              <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>Close</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="What happened?" /></SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Textarea className="rounded-xl" placeholder="Add details (optional)" value={details} onChange={(e) => setDetails(e.target.value)} />
              <Button className="w-full rounded-xl" disabled={!reason || saving} onClick={submit}>
                {saving ? "Submitting..." : "Submit report"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}