import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Target, PartyPopper, Plus } from "lucide-react";
import { money } from "@/lib/grind";

const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;

// Savings goal with the parent's match pledge.
//
// The match is TRACKING ONLY — no money moves through Blockwork for it. The
// parent pays it themselves, and the card says so, so nobody expects a transfer.
export default function SavingsGoalCard({ goal, records = [], onChanged }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [celebrateOpen, setCelebrateOpen] = useState(false);

  const saved = Math.round(
    records
      .filter((r) => !goal?.created_date || !r.occurred_at || new Date(r.occurred_at) >= new Date(goal.created_date))
      .reduce((s, r) => s + (Number(r.net_amount) || 0), 0) * 100
  ) / 100;

  const targetAmount = Number(goal?.target_amount) || 0;
  const pct = targetAmount > 0 ? Math.min(100, Math.round((saved / targetAmount) * 100)) : 0;
  const matchPercent = Number(goal?.match_percent) || 0;
  const matchAmount = Math.round((matchPercent / 100) * saved * 100) / 100;
  const reached = targetAmount > 0 && saved >= targetAmount;

  const create = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await base44.functions.invoke("manageSavingsGoal", {
        action: "create",
        name,
        targetAmount: Number(target),
      });
      if (res.data?.error) throw new Error(res.data.error);
      setCreating(false);
      setName("");
      setTarget("");
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Couldn't save that goal.");
    } finally {
      setSaving(false);
    }
  };

  const seeCelebration = async () => {
    setCelebrateOpen(false);
    try {
      await base44.functions.invoke("manageSavingsGoal", { action: "celebrate", goalId: goal.id });
      onChanged?.();
    } catch {
      /* the celebration already showed — nothing to fix */
    }
  };

  // Show the celebration once, the first time the goal is reached.
  React.useEffect(() => {
    if (reached && goal && !goal.celebrated_at) setCelebrateOpen(true);
  }, [reached, goal?.id, goal?.celebrated_at]);

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-foreground flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" /> Savings goal
        </h2>
        {!goal && (
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => setCreating((v) => !v)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Set a goal
          </Button>
        )}
      </div>

      {!goal && !creating && (
        <p className="text-sm text-muted-foreground">
          Pick something you're saving for and watch it fill up as you earn.
        </p>
      )}

      {!goal && creating && (
        <div className="space-y-3">
          <div>
            <Label>What are you saving for?</Label>
            <Input
              className="rounded-xl mt-1"
              placeholder="AirPods"
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label>Goal amount</Label>
            <Input
              className="rounded-xl mt-1"
              type="number"
              min="1"
              max="5000"
              placeholder="250"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-destructive font-medium">{error}</p>}
          <Button className="w-full rounded-full" disabled={saving || !name.trim() || !target} onClick={create}>
            {saving ? "Saving…" : "Start saving"}
          </Button>
        </div>
      )}

      {goal && (
        <>
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-foreground truncate">{goal.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {fmt(saved)} of {fmt(targetAmount)}
              </p>
            </div>
            <p className="font-display text-2xl font-bold text-foreground shrink-0">{pct}%</p>
          </div>

          <div className="h-3 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-ios"
              style={{ width: `${pct}%` }}
            />
          </div>

          {matchPercent > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm font-semibold text-amber-700">
                Parent's match: +{fmt(matchAmount)}
              </p>
              <p className="text-[11px] text-amber-600 mt-0.5">
                {matchPercent}% of what you save. Matches are paid by your parent directly — Blockwork never moves
                that money.
              </p>
            </div>
          )}

          {reached && (
            <p className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5">
              <PartyPopper className="w-4 h-4" /> Goal reached!
            </p>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-muted-foreground"
            onClick={async () => {
              await base44.functions.invoke("manageSavingsGoal", { action: "archive", goalId: goal.id });
              onChanged?.();
            }}
          >
            Archive this goal
          </Button>
        </>
      )}

      <Dialog open={celebrateOpen} onOpenChange={setCelebrateOpen}>
        <DialogContent className="rounded-2xl max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="text-center">You hit your goal 🎉</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="w-16 h-16 rounded-full bg-amber/20 flex items-center justify-center mx-auto">
              <PartyPopper className="w-8 h-8 text-amber" />
            </div>
            <p className="text-sm text-muted-foreground">
              {goal?.name} — {money(targetAmount)} saved through real work. Your parent has been told.
            </p>
            <Button className="w-full rounded-full" onClick={seeCelebration}>
              Nice
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}