import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Clock, Lock, AlertCircle, CreditCard } from "lucide-react";
import { money } from "@/lib/grind";

export default function CashOutDialog({ open, onOpenChange, wallet, onDone }) {
  const [amount, setAmount] = useState(String(wallet.balance || 0));
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null); // { type: 'processing' | 'locked' | 'error', message }
  const amt = Math.min(Number(amount) || 0, wallet.balance || 0);

  const cashOut = async () => {
    setSaving(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("walletCashOut", { amount: amt });
      const data = res.data || res;
      if (data.locked) {
        setResult({ type: "locked", message: data.message || "Withdrawals are paused." });
      } else if (data.no_payout_account) {
        setResult({ type: "no_payout", message: data.message || "Your parent hasn't set up their payout account yet." });
      } else if (data.error) {
        setResult({ type: "error", message: data.error });
      } else {
        setResult({
          type: "processing",
          message: data.message || "Cash-out submitted. Please allow 24-48 hours for processing.",
        });
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || "Something went wrong. Please try again.";
      const isLocked = err.response?.data?.locked;
      const isNoPayout = err.response?.data?.no_payout_account;
      setResult({
        type: isLocked ? "locked" : isNoPayout ? "no_payout" : "error",
        message: isLocked
          ? (err.response.data.message || "Your parent has paused withdrawals.")
          : isNoPayout
            ? (err.response.data.message || "Your parent hasn't set up their payout account yet.")
            : msg,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setAmount(String(wallet.balance || 0));
    onOpenChange(false);
    if (result?.type === "processing") {
      onDone?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else onOpenChange(o); }}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle>Cash out</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            {result.type === "processing" && (
              <div className="flex flex-col items-center text-center gap-3 py-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-base">Cash-out submitted</p>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    {result.message} Your balance has been updated — funds will arrive in your parent's account within 24-48 hours.
                  </p>
                </div>
              </div>
            )}
            {result.type === "locked" && (
              <div className="flex flex-col items-center text-center gap-3 py-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-base">Withdrawals paused</p>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{result.message}</p>
                </div>
              </div>
            )}
            {result.type === "no_payout" && (
              <div className="flex flex-col items-center text-center gap-3 py-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-base">Payout account needed</p>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{result.message}</p>
                </div>
              </div>
            )}
            {result.type === "error" && (
              <div className="flex flex-col items-center text-center gap-3 py-4">
                <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-base">Couldn't cash out</p>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{result.message}</p>
                </div>
              </div>
            )}
            <Button className="w-full rounded-xl" onClick={handleClose}>
              {result.type === "processing" ? "Done" : "Close"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Amount (available: {money(wallet.balance || 0)})</Label>
              <Input type="number" min="1" max={wallet.balance} className="rounded-xl mt-1" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="flex items-start gap-2 bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
              Cash-outs go to your parent's payout account — they can see every transfer.
            </div>
            <div className="flex items-start gap-2 bg-amber-50 rounded-xl p-3 text-xs text-amber-700">
              <Clock className="w-4 h-4 mt-0.5 shrink-0" />
              Please allow 24-48 hours for processing after you request a cash-out.
            </div>
            <Button className="w-full rounded-xl" disabled={amt <= 0 || saving} onClick={cashOut}>
              {saving ? "Submitting..." : `Cash out ${money(amt)}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}