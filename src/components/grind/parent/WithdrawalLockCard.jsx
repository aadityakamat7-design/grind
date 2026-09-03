import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Switch } from "@/components/ui/switch";
import { Lock, Unlock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Parent-controlled toggle that lets a parent pause/resume their teen's
// ability to cash out their Blockwork Wallet balance. Stored on the
// ParentTeenLink entity (withdrawals_locked field).
export default function WithdrawalLockCard({ link, onUpdated }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const locked = !!link.withdrawals_locked;

  const toggle = async () => {
    setSaving(true);
    try {
      await base44.entities.ParentTeenLink.update(link.id, { withdrawals_locked: !locked });
      toast({
        title: !locked ? "Withdrawals paused" : "Withdrawals enabled",
        description: !locked
          ? `${link.teen_display_name} can no longer cash out their wallet.`
          : `${link.teen_display_name} can cash out again.`,
      });
      onUpdated?.();
    } catch {
      toast({ title: "Couldn't update", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-2xl bg-card border border-border p-4">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${locked ? "bg-amber-50" : "bg-emerald-50"}`}>
          {locked ? <Lock className="w-4 h-4 text-amber-600" /> : <Unlock className="w-4 h-4 text-emerald-600" />}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Teen withdrawals</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {locked
              ? "Cash-outs are paused — your teen can't withdraw their wallet balance."
              : "Cash-outs are enabled — your teen can withdraw their wallet balance."}
          </p>
        </div>
      </div>
      <Switch checked={locked} onCheckedChange={toggle} disabled={saving} />
    </div>
  );
}