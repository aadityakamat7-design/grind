import React from "react";

const STYLES = {
  pending_parent_approval: "bg-secondary text-muted-foreground border-border",
  pending_parent: "bg-secondary text-muted-foreground border-border",
  pending: "bg-secondary text-muted-foreground border-border",
  confirmed: "bg-foreground text-background border-foreground",
  active: "bg-foreground text-background border-foreground",
  published: "bg-foreground text-background border-foreground",
  in_progress: "bg-secondary text-foreground border-border",
  completed: "bg-foreground text-background border-foreground",
  released: "bg-foreground text-background border-foreground",
  held: "bg-secondary text-muted-foreground border-border",
  paused: "bg-secondary text-muted-foreground border-border",
  draft: "bg-secondary text-muted-foreground border-border",
  unpaid: "bg-secondary text-muted-foreground border-border",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  denied: "bg-destructive/10 text-destructive border-destructive/20",
  refunded: "bg-destructive/10 text-destructive border-destructive/20",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
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
  const style = STYLES[status] || "bg-secondary text-muted-foreground border-border";
  const label = LABELS[status] || status.replace(/_/g, " ");
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${style} ${className}`}>
      {label}
    </span>
  );
}