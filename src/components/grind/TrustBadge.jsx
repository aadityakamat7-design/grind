import React from "react";
import { ShieldCheck, BadgeCheck, MapPin } from "lucide-react";

const TYPES = {
  parent_approved: { icon: ShieldCheck, label: "Parent-approved", cls: "bg-emerald-50 text-emerald-700" },
  id_verified: { icon: BadgeCheck, label: "ID-verified neighbor", cls: "bg-blue-50 text-blue-700" },
  location_shared: { icon: MapPin, label: "Location shared with parent", cls: "bg-violet-50 text-violet-700" },
};

export default function TrustBadge({ type, className = "" }) {
  const t = TYPES[type];
  if (!t) return null;
  const Icon = t.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${t.cls} ${className}`}>
      <Icon className="w-3.5 h-3.5" />
      {t.label}
    </span>
  );
}