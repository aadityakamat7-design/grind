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
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" },
];

// Report a review without exposing the reviewer's identity — the server
// looks up the author from the reviewId so the client never needs it.
export default function ReportReviewButton({ reviewId, label = "Report review" }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      await base44.functions.invoke("reportReview", { reviewId, reason, details });
    } catch (err) {
      setSaving(false);
      setError(err.response?.data?.error || "Couldn't submit your report.");
      return;
    }
    setSaving(false);
    setDone(true);
  };

  return (
    <>
      <button
        onClick={() => { setDone(false); setReason(""); setDetails(""); setError(""); setOpen(true); }}
        className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors"
      >
        <Flag className="w-3.5 h-3.5" /> {label}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Report this review</DialogTitle>
          </DialogHeader>
          {done ? (
            <div className="text-center py-4 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Thanks — our safety team will review this report.</p>
              <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>Close</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="What's wrong with this review?" /></SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Textarea className="rounded-xl" placeholder="Add details (optional)" value={details} onChange={(e) => setDetails(e.target.value)} />
              {error && <p className="text-xs text-destructive font-medium text-center">{error}</p>}
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