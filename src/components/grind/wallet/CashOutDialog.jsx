import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";
import { money } from "@/lib/grind";
import { notify } from "@/lib/notify";

export default function CashOutDialog({ open, onOpenChange, wallet, onDone }) {
  const [amount, setAmount] = useState(String(wallet.balance || 0));
  const [saving, setSaving] = useState(false);
  const amt = Math.min(Number(amount) || 0, wallet.balance || 0);

  const cashOut = async () => {
    setSaving(true);
    await base44.entities.WalletTransaction.create({
      teen_user_id: wallet.teen_user_id,
      type: "cashout",
      amount: amt,
      description: "Instant cash-out to parent account",
      occurred_at: new Date().toISOString(),
    });
    await base44.entities.WalletAccount.update(wallet.id, {
      balance: Math.round(((wallet.balance || 0) - amt) * 100) / 100,
    });
    const links = await base44.entities.ParentTeenLink.filter({ teen_user_id: wallet.teen_user_id, status: "confirmed" });
    await notify(links[0]?.parent_user_id, {
      type: "payment",
      title: "Teen cash-out",
      body: `${money(amt)} was cashed out from the Kickstart Wallet to your account.`,
      link: "/parent/payouts",
    });
    setSaving(false);
    onOpenChange(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle>Cash out</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Amount (available: {money(wallet.balance || 0)})</Label>
            <Input type="number" min="1" max={wallet.balance} className="rounded-xl mt-1" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="flex items-start gap-2 bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
            Cash-outs go instantly to your parent's payout account — they can see every transfer.
          </div>
          <Button className="w-full rounded-xl" disabled={amt <= 0 || saving} onClick={cashOut}>
            {saving ? "Transferring..." : `Cash out ${money(amt)}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}