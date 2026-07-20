import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, ShieldCheck, Search, LayoutDashboard } from "lucide-react";

const ROLES = [
  { key: "TEEN", label: "Teen", icon: Sparkles, home: "/teen" },
  { key: "PARENT", label: "Parent", icon: ShieldCheck, home: "/parent" },
  { key: "BUYER", label: "Neighbor", icon: Search, home: "/browse" },
  { key: "ADMIN", label: "Admin", icon: LayoutDashboard, home: "/admin" },
];

export default function RoleSwitcher({ user }) {
  const [switching, setSwitching] = useState(false);

  const switchTo = async (role) => {
    setSwitching(true);
    await base44.auth.updateMe({ app_role: role.key, onboarded: true });
    window.location.href = role.home;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <p className="font-bold text-slate-900 text-sm">Demo role switcher</p>
      <p className="text-xs text-slate-500 mt-0.5">Explore every dashboard without creating separate accounts.</p>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {ROLES.map((r) => (
          <button
            key={r.key}
            disabled={switching || user.app_role === r.key}
            onClick={() => switchTo(r)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
              user.app_role === r.key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
            }`}
          >
            <r.icon className="w-4 h-4" /> {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}