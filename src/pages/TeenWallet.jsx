import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, FileText, Wallet, Bot } from "lucide-react";
import { getOrCreateWallet } from "@/lib/wallet";
import { money } from "@/lib/grind";
import TransactionList from "@/components/grind/wallet/TransactionList";
import CashOutDialog from "@/components/grind/wallet/CashOutDialog";
import PageHeader from "@/components/grind/PageHeader";
import ErrorRetry from "@/components/grind/ErrorRetry";

export default function TeenWallet() {
  const { user } = useOutletContext();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [cashOutOpen, setCashOutOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const w = await getOrCreateWallet(user.id);
      const txns = await base44.entities.WalletTransaction.filter({ teen_user_id: user.id }, "-occurred_at", 30);
      setWallet(w);
      setTransactions(txns);
    } catch (err) {
      console.error("TeenWallet load failed:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  if (loading)
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-lg bg-muted skeleton-shimmer" />
        <div className="bg-card rounded-2xl border border-border h-32 skeleton-shimmer" />
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl border border-border h-12 skeleton-shimmer" />
          <div className="bg-card rounded-2xl border border-border h-12 skeleton-shimmer" />
        </div>
      </div>
    );
  if (error) return <ErrorRetry onRetry={load} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Blockwork Wallet" subtitle="Your earnings, ready to cash out." />

      <div className="bg-gradient-to-br from-foreground to-primary rounded-2xl p-6 text-primary-foreground shadow-card">
        <p className="text-[13px] opacity-80 flex items-center gap-1.5"><Wallet className="w-4 h-4" /> Current balance</p>
        <p className="text-[40px] font-extrabold mt-1.5 tracking-tight">{money(wallet.balance || 0)}</p>
        <p className="text-[12px] opacity-70 mt-2">Job payouts land here the moment a neighbor releases payment.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button className="rounded-full h-12" disabled={(wallet.balance || 0) <= 0} onClick={() => setCashOutOpen(true)}>
          <ArrowUpRight className="w-4 h-4 mr-1.5" /> Cash out
        </Button>
        <Link to="/withdrawal-assistant">
          <Button variant="outline" className="rounded-full w-full h-12">
            <Bot className="w-4 h-4 mr-1.5" /> Withdrawal Assistant
          </Button>
        </Link>
      </div>

      <section>
        <h2 className="text-[17px] font-bold text-foreground mb-3">Activity</h2>
        <TransactionList transactions={transactions} />
      </section>

      {/* Bottom links: earnings/taxes + legal */}
      <div className="pt-4 mt-2 border-t border-border">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <Link to="/teen/earnings" className="flex items-center gap-1.5 font-medium hover:text-foreground transition-colors">
            <FileText className="w-3.5 h-3.5" /> Earnings & taxes
          </Link>
          <Link to="/terms" className="font-medium hover:text-foreground transition-colors">Terms</Link>
          <Link to="/privacy" className="font-medium hover:text-foreground transition-colors">Privacy</Link>
        </div>
      </div>

      {cashOutOpen && (
        <CashOutDialog open={cashOutOpen} onOpenChange={setCashOutOpen} wallet={wallet} onDone={load} />
      )}
    </div>
  );
}