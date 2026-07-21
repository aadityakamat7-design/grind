import React from "react";

const STYLES = {
  pending_parent_approval: "bg-amber-50 text-amber-700 border-amber-200",
  pending_parent: "bg-amber-50 text-amber-700 border-amber-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-sky-50 text-sky-700 border-sky-200",
  released: "bg-sky-50 text-sky-700 border-sky-200",
  held: "bg-slate-100 text-slate-600 border-slate-200",
  paused: "bg-slate-100 text-slate-600 border-slate-200",
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  unpaid: "bg-amber-50 text-amber-700 border-amber-200",
  cancelled: "bg-rose-50 text-rose-600 border-rose-200",
  denied: "bg-rose-50 text-rose-600 border-rose-200",
  refunded: "bg-rose-50 text-rose-600 border-rose-200",
  suspended: "bg-rose-50 text-rose-600 border-rose-200",
};

const LABELS = {
  pending_parent_approval: "Awaiting parent approval",
  pending_parent: "Waiting for parent",
  in_progress: "In progress",
  held: "Payment held",
  unpaid: "Payment pending",
  released: "Paid out",
};

export default function StatusBadge({ status, className = "" }) {
  if (!status) return null;
  const style = STYLES[status] || "bg-slate-100 text-slate-600 border-slate-200";
  const label = LABELS[status] || status.replace(/_/g, " ");
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${style} ${className}`}>
      {label}
    </span>
  );
}