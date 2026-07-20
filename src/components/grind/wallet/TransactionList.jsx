import React from "react";
import { ArrowDownLeft, ArrowUpRight, PiggyBank } from "lucide-react";
import { format } from "date-fns";
import { money } from "@/lib/grind";

const CONFIG = {
  earning: { icon: ArrowDownLeft, style: "bg-emerald-50 text-emerald-600", sign: "+" },
  save: { icon: PiggyBank, style: "bg-blue-50 text-blue-600", sign: "" },
  cashout: { icon: ArrowUpRight, style: "bg-slate-100 text-slate-500", sign: "−" },
};

export default function TransactionList({ transactions }) {
  if (transactions.length === 0)
    return <p className="text-sm text-slate-400">No activity yet — your job payouts will land here.</p>;
  return (
    <div className="space-y-2.5">
      {transactions.map((t) => {
        const c = CONFIG[t.type] || CONFIG.earning;
        const Icon = c.icon;
        return (
          <div key={t.id} className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-3.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.style}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{t.description || t.type}</p>
              <p className="text-[11px] text-slate-400">
                {t.occurred_at ? format(new Date(t.occurred_at), "MMM d, yyyy") : ""}
              </p>
            </div>
            <p className={`font-bold text-sm ${t.type === "earning" ? "text-emerald-600" : "text-slate-700"}`}>
              {c.sign}{money(t.amount)}
            </p>
          </div>
        );
      })}
    </div>
  );
}