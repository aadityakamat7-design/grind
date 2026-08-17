import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, FileText, Wallet } from "lucide-react";
import { getOrCreateWallet } from "@/lib/wallet";
import { money } from "@/lib/grind";
import TransactionList from "@/components/grind/wallet/TransactionList";
import CashOutDialog from "@/components/grind/wallet/CashOutDialog";
import PageHeader from "@/components/grind/PageHeader";

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
    return (
      <div className="flex justify-center py-24">
        <div className="w-8 h-8 border-[3px] border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader title="Kickstart Wallet" subtitle="Your earnings, ready to cash out." />

      <div className="bg-gradient-to-br from-foreground to-primary rounded-2xl p-6 text-primary-foreground shadow-card">
        <p className="text-[13px] opacity-80 flex items-center gap-1.5"><Wallet className="w-4 h-4" /> Current balance</p>
        <p className="text-[40px] font-extrabold mt-1.5 tracking-tight">{money(wallet.balance || 0)}</p>
        <p className="text-[12px] opacity-70 mt-2">Job payouts land here the moment a neighbor releases payment.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button className="rounded-full h-12" disabled={(wallet.balance || 0) <= 0} onClick={() => setCashOutOpen(true)}>
          <ArrowUpRight className="w-4 h-4 mr-1.5" /> Cash out
        </Button>
        <Link to="/teen/earnings">
          <Button variant="outline" className="rounded-full w-full h-12">
            <FileText className="w-4 h-4 mr-1.5" /> Earnings & taxes
          </Button>
        </Link>
      </div>

      <section>
        <h2 className="text-[17px] font-bold text-foreground mb-3">Activity</h2>
        <TransactionList transactions={transactions} />
      </section>

      {cashOutOpen && (
        <CashOutDialog open={cashOutOpen} onOpenChange={setCashOutOpen} wallet={wallet} onDone={load} />
      )}
    </div>
  );
}