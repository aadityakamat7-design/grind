import React from "react";
import { Link } from "react-router-dom";
import { Wallet, ArrowUpRight } from "lucide-react";
import { money } from "@/lib/grind";

export default function StudentIncomeCard({ name, total, week, pending, connectStatus }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <p className="font-bold text-slate-900 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-emerald-500" /> {name}'s income
        </p>
        <Link to="/parent/payouts" className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700">
          Payouts <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-3">
        <div>
          <p className="text-lg font-extrabold text-slate-900">{money(total)}</p>
          <p className="text-[11px] text-slate-500">Total earned</p>
        </div>
        <div>
          <p className="text-lg font-extrabold text-slate-900">{money(week)}</p>
          <p className="text-[11px] text-slate-500">This week</p>
        </div>
        <div>
          <p className="text-lg font-extrabold text-slate-900">{money(pending)}</p>
          <p className="text-[11px] text-slate-500">Pending escrow</p>
        </div>
      </div>
      <p className={`text-[11px] font-semibold mt-3 ${connectStatus === "active" ? "text-emerald-600" : "text-amber-600"}`}>
        {connectStatus === "active" ? "● Payout account active — cash-outs land in your account" : "● Payout account not set up yet"}
      </p>
    </div>
  );
}