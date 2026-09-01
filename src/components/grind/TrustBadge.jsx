import React from "react";
import { ShieldCheck, BadgeCheck } from "lucide-react";

const TYPES = {
  parent_approved: { icon: ShieldCheck, label: "Parent-approved", cls: "bg-secondary text-muted-foreground" },
  id_verified: { icon: BadgeCheck, label: "ID-verified neighbor", cls: "bg-secondary text-muted-foreground" },
};

export default function TrustBadge({ type, className = "" }) {
  const t = TYPES[type];
  if (!t) return null;
  const Icon = t.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${t.cls} ${className}`}>
      <Icon className="w-3.5 h-3.5" />
      {t.label}
    </span>
  );
}