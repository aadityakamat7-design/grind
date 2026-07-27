import React from "react";
import { Sparkles, ShieldCheck, Search, ChevronRight } from "lucide-react";

const ROLES = [
  { key: "teen", icon: Sparkles, title: "I'm a teen (13–17)", desc: "I want to earn money doing local jobs" },
  { key: "parent", icon: ShieldCheck, title: "I'm a parent", desc: "My teen invited me to approve their account" },
  { key: "buyer", icon: Search, title: "I'm a neighbor (18+)", desc: "I want to hire trusted local teens" },
];

export default function RolePicker({ onSelect }) {
  return (
    <div className="space-y-3">
      {ROLES.map((r) => (
        <button
          key={r.key}
          onClick={() => onSelect(r.key)}
          className="w-full flex items-center gap-4 bg-card rounded-2xl border border-border shadow-soft p-5 text-left hover:shadow-card hover:border-foreground/20 transition-all duration-200"
        >
          <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <r.icon className="w-6 h-6 text-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">{r.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
        </button>
      ))}
    </div>
  );
}