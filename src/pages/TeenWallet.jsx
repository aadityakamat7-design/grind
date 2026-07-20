import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, FileText, Lightbulb } from "lucide-react";
import { getOrCreateWallet } from "@/lib/wallet";
import WalletCard from "@/components/grind/wallet/WalletCard";
import SavingsGoals from "@/components/grind/wallet/SavingsGoals";
import TransactionList from "@/components/grind/wallet/TransactionList";
import CashOutDialog from "@/components/grind/wallet/CashOutDialog";

export default function TeenWallet() {
  const { user } = useOutletContext();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cashOutOpen, setCashOutOpen] = useState(false);

  const load = useCallback(async () => {
    const w = await getOrCreateWallet(user.id);
    const [txns, gls] = await Promise.all([
      base44.entities.WalletTransaction.filter({ teen_user_id: user.id }, "-occurred_at", 30),
      base44.entities.SavingsGoal.filter({ teen_user_id: user.id }, "-created_date"),
    ]);
    setWallet(w);
    setTransactions(txns);
    setGoals(gls);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  if (loading)
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">Grind Wallet</h1>

      <WalletCard name={user.full_name || "Grind Teen"} balance={wallet.balance || 0} last4={wallet.card_last4} />

      <div className="grid grid-cols-2 gap-3">
        <Button className="rounded-xl" disabled={(wallet.balance || 0) <= 0} onClick={() => setCashOutOpen(true)}>
          <ArrowUpRight className="w-4 h-4 mr-1.5" /> Cash out
        </Button>
        <Link to="/teen/earnings">
          <Button variant="outline" className="rounded-xl w-full">
            <FileText className="w-4 h-4 mr-1.5" /> Earnings & taxes
          </Button>
        </Link>
      </div>

      <SavingsGoals goals={goals} wallet={wallet} teenUserId={user.id} onChanged={load} />

      <div className="flex items-start gap-2.5 bg-amber-50 rounded-2xl p-4 text-xs text-amber-800">
        <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" />
        <p><span className="font-bold">Money tip:</span> people who save automatically save 3× more. Turn on auto-save and you'll never miss the money.</p>
      </div>

      <div>
        <h2 className="font-bold text-slate-900 mb-3">Activity</h2>
        <TransactionList transactions={transactions} />
      </div>

      {cashOutOpen && (
        <CashOutDialog open={cashOutOpen} onOpenChange={setCashOutOpen} wallet={wallet} onDone={load} />
      )}
    </div>
  );
}