import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { HandCoins } from "lucide-react";
import { money } from "@/lib/grind";

// The parent's side of a savings goal: pledge a percentage to match what their
// teen saves. Tracking only — the parent pays it themselves, and the UI says so.
export default function MatchPledgeCard({ goals = [], teenNames = {}, onUpdated }) {
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState("");

  if (!goals.length) return null;

  const save = async (goal) => {
    const pct = values[goal.id] ?? String(goal.match_percent ?? 0);
    const numeric = Math.max(0, Math.min(100, Number(pct) || 0));
    setSaving(goal.id);
    try {
      await base44.functions.invoke("manageSavingsGoal", {
        action: "pledge",
        goalId: goal.id,
        matchPercent: numeric,
      });
      onUpdated?.();
    } catch (err) {
      console.error("match pledge:", err);
    } finally {
      setSaving("");
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-5 space-y-4">
      <div className="flex items-center gap-2">
        <HandCoins className="w-4 h-4 text-primary" />
        <h2 className="font-bold text-foreground">Savings goals</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Pledge a match to encourage saving. Matches are paid by you directly — Blockwork never moves that money.
      </p>

      <div className="space-y-3">
        {goals.map((goal) => {
          const name = teenNames[goal.teen_user_id]?.split(" ")[0] || "your teen";
          return (
            <div key={goal.id} className="rounded-xl border border-border p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {name} — {goal.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Goal {money(goal.target_amount)}
                    {Number(goal.match_percent) > 0 ? ` · matching ${goal.match_percent}%` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-xl border border-input px-3 h-10 flex-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    aria-label={`Match percentage for ${goal.name}`}
                    className="w-full bg-transparent text-sm text-foreground outline-none"
                    value={values[goal.id] ?? goal.match_percent ?? 0}
                    onChange={(e) => setValues((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <Button
                  size="sm"
                  className="rounded-full shrink-0"
                  disabled={saving === goal.id}
                  onClick={() => save(goal)}
                >
                  {saving === goal.id ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}