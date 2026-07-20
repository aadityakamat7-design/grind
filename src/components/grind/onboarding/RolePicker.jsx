import React from "react";
import { Sparkles, ShieldCheck, Search, ChevronRight } from "lucide-react";

const ROLES = [
  { key: "TEEN", icon: Sparkles, title: "I'm a teen (13–17)", desc: "I want to earn money doing local jobs", cls: "bg-blue-50 text-blue-600" },
  { key: "PARENT", icon: ShieldCheck, title: "I'm a parent", desc: "My teen invited me to approve their account", cls: "bg-emerald-50 text-emerald-600" },
  { key: "BUYER", icon: Search, title: "I'm a neighbor (18+)", desc: "I want to hire trusted local teens", cls: "bg-blue-50 text-blue-600" },
];

export default function RolePicker({ onSelect }) {
  return (
    <div className="space-y-3">
      {ROLES.map((r) => (
        <button
          key={r.key}
          onClick={() => onSelect(r.key)}
          className="w-full flex items-center gap-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-left hover:border-blue-200 hover:shadow-md transition-all"
        >
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${r.cls}`}>
            <r.icon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-900">{r.title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300" />
        </button>
      ))}
    </div>
  );
}