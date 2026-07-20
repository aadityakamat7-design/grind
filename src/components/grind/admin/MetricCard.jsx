import React from "react";

export default function MetricCard({ icon: Icon, label, value, accent = "text-blue-500" }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <Icon className={`w-5 h-5 ${accent}`} />
      <p className="text-xl font-extrabold text-slate-900 mt-2">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}