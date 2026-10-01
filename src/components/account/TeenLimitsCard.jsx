import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { callAccountFunction } from "@/lib/accountApi";

const DAYS = [
  { value: 1, label: "Mon" }, { value: 2, label: "Tue" }, { value: 3, label: "Wed" },
  { value: 4, label: "Thu" }, { value: 5, label: "Fri" }, { value: 6, label: "Sat" }, { value: 0, label: "Sun" },
];
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);
const fmtHour = (h) => `${h === 12 ? 12 : h > 12 ? h - 12 : h} ${h >= 12 ? "PM" : "AM"}`;

// Limits for one teen, saved through the server so each change is validated and
// recorded. The stricter of these and the legal limits always applies.
export default function TeenLimitsCard({ teen, onSaved }) {
  const { toast } = useToast();
  const [limits, setLimits] = useState({
    max_hours_per_week: teen.limits?.max_hours_per_week ?? "",
    max_distance_miles: teen.limits?.max_distance_miles ?? "",
    earliest_hour: teen.limits?.earliest_hour ?? "",
    latest_hour: teen.limits?.latest_hour ?? "",
    allowed_days: teen.limits?.allowed_days || [],
    no_school_nights: !!teen.limits?.no_school_nights,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key, value) => setLimits((prev) => ({ ...prev, [key]: value }));
  const toggleDay = (day) => set("allowed_days", limits.allowed_days.includes(day)
    ? limits.allowed_days.filter((d) => d !== day)
    : [...limits.allowed_days, day]);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await callAccountFunction("parentTeenControl", {
        teen_user_id: teen.teen_user_id,
        action: "set_limits",
        value: limits,
      });
      toast({ title: `Limits saved for ${teen.name}` });
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border p-3.5 space-y-3.5 bg-background">
      <p className="text-[13px] font-semibold text-foreground flex items-center gap-2">
        <SlidersHorizontal className="w-3.5 h-3.5 text-primary" /> Limits for {teen.name}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Max hours per week</Label>
          <Input className="rounded-xl mt-1" type="number" min="1" max="40" placeholder="No limit" value={limits.max_hours_per_week} onChange={(e) => set("max_hours_per_week", e.target.value)} />
        </div>
        <div>
          <Label>Max distance (mi)</Label>
          <Input className="rounded-xl mt-1" type="number" min="1" max="25" placeholder="No limit" value={limits.max_distance_miles} onChange={(e) => set("max_distance_miles", e.target.value)} />
        </div>
      </div>

      <div>
        <Label>Allowed days</Label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {DAYS.map((d) => {
            const on = limits.allowed_days.includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                className={cn(
                  "rounded-full px-3 h-8 text-xs font-semibold border transition-colors",
                  on ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/40",
                )}
              >
                {d.label}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">Leave all off to allow any day.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Not before</Label>
          <select className="mt-1 h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm text-foreground" value={limits.earliest_hour} onChange={(e) => set("earliest_hour", e.target.value)}>
            <option value="">Any time</option>
            {HOURS.map((h) => <option key={h} value={h}>{fmtHour(h)}</option>)}
          </select>
        </div>
        <div>
          <Label>Not after</Label>
          <select className="mt-1 h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm text-foreground" value={limits.latest_hour} onChange={(e) => set("latest_hour", e.target.value)}>
            <option value="">Any time</option>
            {HOURS.map((h) => <option key={h} value={h}>{fmtHour(h)}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-secondary p-3.5">
        <div className="min-w-0 pr-2">
          <p className="text-[13px] font-medium text-foreground">No jobs on school nights</p>
          <p className="text-[11px] text-muted-foreground">Sunday–Thursday after 6 PM.</p>
        </div>
        <Switch checked={limits.no_school_nights} onCheckedChange={(v) => set("no_school_nights", v)} />
      </div>

      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
      <Button size="sm" className="w-full rounded-full" disabled={saving} onClick={save}>
        {saving ? "Saving…" : "Save limits"}
      </Button>
    </div>
  );
}