import React from "react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/grind/StatusBadge";

const REASON_LABELS = {
  safety: "Safety concern",
  off_platform: "Off-platform request",
  inappropriate: "Inappropriate behavior",
  spam: "Spam",
  other: "Other",
};

export default function ReportRow({ report, onResolve, onHideReview, acting }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-slate-900 text-sm">{REASON_LABELS[report.reason] || report.reason}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {report.reporter_name || "Someone"} reported {report.subject_name || report.subject_id}
            {report.review_id && " — flagged a review"}
          </p>
        </div>
        <StatusBadge status={report.status === "open" ? "pending" : "completed"} />
      </div>
      {report.details && <p className="text-sm text-slate-600 mt-2">{report.details}</p>}
      {report.status === "open" && (
        <div className="flex gap-2 mt-3">
          {report.review_id && (
            <Button
              variant="outline"
              className="rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
              disabled={acting}
              onClick={() => onHideReview(report)}
            >
              Hide review
            </Button>
          )}
          <Button variant="outline" className="rounded-xl" disabled={acting} onClick={() => onResolve(report)}>
            Mark resolved
          </Button>
        </div>
      )}
    </div>
  );
}