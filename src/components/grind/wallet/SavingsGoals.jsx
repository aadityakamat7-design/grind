import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Plus, PiggyBank } from "lucide-react";
import { money } from "@/lib/grind";
import AddGoalDialog from "@/components/grind/wallet/AddGoalDialog";

export default function SavingsGoals({ goals, wallet, teenUserId, onChanged }) {
  const [addOpen, setAddOpen] = useState(false);

  const setAutoSave = async (pct) => {
    await base44.entities.WalletAccount.update(wallet.id, { auto_save_pct: Number(pct) });
    onChanged();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-900 flex items-center gap-2"><Target className="w-4 h-4 text-blue-500" /> Savings goals</h2>
        <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setAddOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> New goal
        </Button>
      </div>

      <div className="flex items-center justify-between bg-blue-50 rounded-2xl p-3.5">
        <p className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
          <PiggyBank className="w-4 h-4" /> Auto-save from every job
        </p>
        <Select value={String(wallet.auto_save_pct || 0)} onValueChange={setAutoSave}>
          <SelectTrigger className="rounded-xl w-24 h-8 bg-white text-xs font-bold"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[0, 10, 20, 30, 50].map((p) => <SelectItem key={p} value={String(p)}>{p === 0 ? "Off" : `${p}%`}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {goals.length === 0 ? (
        <p className="text-sm text-slate-400">No goals yet. Saving a little from every job adds up fast.</p>
      ) : (
        goals.map((g) => {
          const pct = Math.min(100, Math.round(((g.saved_amount || 0) / g.target_amount) * 100));
          return (
            <div key={g.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center justify-between">
                <p className="font-bold text-slate-900 text-sm">{g.emoji ? `${g.emoji} ` : ""}{g.name}</p>
                <p className="text-xs font-semibold text-slate-500">{money(g.saved_amount || 0)} / {money(g.target_amount)}</p>
              </div>
              <div className="h-2 bg-slate-100 rounded-full mt-2.5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-sky-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">{pct}% there{pct >= 100 ? " — goal reached! 🎉" : ""}</p>
            </div>
          );
        })
      )}

      <AddGoalDialog open={addOpen} onOpenChange={setAddOpen} teenUserId={teenUserId} onSaved={onChanged} />
    </div>
  );
}