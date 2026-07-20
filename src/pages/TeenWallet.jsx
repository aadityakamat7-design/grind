import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, FileText, Wallet } from "lucide-react";
import { getOrCreateWallet } from "@/lib/wallet";
import { money } from "@/lib/grind";
import TransactionList from "@/components/grind/wallet/TransactionList";
import CashOutDialog from "@/components/grind/wallet/CashOutDialog";

export default function TeenWallet() {
  const { user } = useOutletContext();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cashOutOpen, setCashOutOpen] = useState(false);

  const load = useCallback(async () => {
    const w = await getOrCreateWallet(user.id);
    const txns = await base44.entities.WalletTransaction.filter({ teen_user_id: user.id }, "-occurred_at", 30);
    setWallet(w);
    setTransactions(txns);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  if (loading)
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">Grind Wallet</h1>

      <div className="bg-gradient-to-br from-blue-600 to-sky-500 rounded-2xl p-6 text-white shadow-lg shadow-blue-100">
        <p className="text-xs opacity-80 flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Current balance</p>
        <p className="text-4xl font-extrabold mt-1">{money(wallet.balance || 0)}</p>
        <p className="text-[11px] opacity-70 mt-2">Job payouts land here the moment a neighbor releases payment.</p>
      </div>

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