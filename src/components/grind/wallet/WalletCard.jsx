import React from "react";
import { Zap, Wifi } from "lucide-react";
import { money } from "@/lib/grind";

export default function WalletCard({ name, balance, last4 }) {
  return (
    <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900 p-6 text-white shadow-lg overflow-hidden">
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-sky-400/10" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold tracking-tight">Grind</span>
        </div>
        <Wifi className="w-5 h-5 text-sky-300 rotate-90" />
      </div>
      <p className="text-xs text-blue-200 mt-6">Wallet balance</p>
      <p className="text-3xl font-extrabold mt-0.5">{money(balance)}</p>
      <div className="flex items-end justify-between mt-6">
        <p className="text-sm font-semibold text-blue-100">{name}</p>
        <p className="text-sm font-mono tracking-widest text-blue-200">•••• {last4 || "0000"}</p>
      </div>
    </div>
  );
}