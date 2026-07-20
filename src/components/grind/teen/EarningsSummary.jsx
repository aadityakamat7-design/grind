import React from "react";
import { ArrowUpRight, Wallet } from "lucide-react";
import { money } from "@/lib/grind";

export default function EarningsSummary({ balance, week, pending, onCashOut }) {
  return (
    <div className="bg-gradient-to-br from-blue-600 to-sky-500 rounded-2xl p-5 text-white shadow-lg shadow-blue-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs opacity-80 flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Grind Wallet balance</p>
          <p className="text-3xl font-extrabold mt-1">{money(balance)}</p>
        </div>
        <button
          onClick={onCashOut}
          disabled={balance <= 0}
          className="flex items-center gap-1 bg-white/20 hover:bg-white/30 rounded-xl px-3 py-2 text-xs font-bold transition-colors disabled:opacity-50"
        >
          <ArrowUpRight className="w-3.5 h-3.5" /> Cash out
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/20">
        <div>
          <p className="text-lg font-extrabold">{money(week)}</p>
          <p className="text-[11px] opacity-80">Earned this week</p>
        </div>
        <div>
          <p className="text-lg font-extrabold">{money(pending)}</p>
          <p className="text-[11px] opacity-80">Pending in escrow</p>
        </div>
      </div>
    </div>
  );
}