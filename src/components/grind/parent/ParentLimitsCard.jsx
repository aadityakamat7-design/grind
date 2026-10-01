import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SlidersHorizontal, Save } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6am – 11pm
const fmtHour = (h) => {
  const suffix = h >= 12 ? "PM" : "AM";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display} ${suffix}`;
};

// Parent-set limits for one teen. These are enforced on the server wherever the
// teen could otherwise work, and the stricter of these and the legal limits
// always applies.
export default function ParentLimitsCard({ link, teenName, onUpdated }) {
  const [limits, setLimits] = useState({
    max_hours_per_week: link?.limits?.max_hours_per_week ?? "",
    allowed_days: link?.limits?.allowed_days ?? [],
    earliest_hour: link?.limits?.earliest_hour ?? "",
    latest_hour: link?.limits?.latest_hour ?? "",
    no_school_nights: !!link?.limits?.no_school_nights,
    max_distance_miles: link?.limits?.max_distance_miles ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const set = (key, value) => {
    setLimits((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const toggleDay = (day) => {
    setLimits((prev) => {
      const days = prev.allowed_days.includes(day)
        ? prev.allowed_days.filter((d) => d !== day)
        : [...prev.allowed_days, day];
      return { ...prev, allowed_days: days };
    });
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const clean = {};
      if (limits.max_hours_per_week !== "" && limits.max_hours_per_week != null) {
        const n = Number(limits.max_hours_per_week);
        if (!Number.isFinite(n) || n < 1 || n > 40) throw new Error("Weekly hours must be between 1 and 40.");
        clean.max_hours_per_week = n;
      }
      if (limits.allowed_days.length > 0) clean.allowed_days = limits.allowed_days;
      if (limits.earliest_hour !== "" && limits.earliest_hour != null) clean.earliest_hour = Number(limits.earliest_hour);
      if (limits.latest_hour !== "" && limits.latest_hour != null) clean.latest_hour = Number(limits.latest_hour);
      if (clean.earliest_hour != null && clean.latest_hour != null && clean.latest_hour <= clean.earliest_hour) {
        throw new Error("The latest hour has to be after the earliest hour.");
      }
      clean.no_school_nights = !!limits.no_school_nights;
      if (limits.max_distance_miles !== "" && limits.max_distance_miles != null) {
        const d = Number(limits.max_distance_miles);
        if (!Number.isFinite(d) || d < 1 || d > 25) throw new Error("Distance must be between 1 and 25 miles.");
        clean.max_distance_miles = d;
      }

      await base44.entities.ParentTeenLink.update(link.id, {
        limits: clean,
        limits_updated_at: new Date().toISOString(),
      });
      setSaved(true);
      onUpdated?.();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Couldn't save those limits.");
    } finally {
      setSaving(false);
    }
  };

  const name = teenName || link?.teen_display_name?.split(" ")[0] || "your teen";

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-5 space-y-4">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="w-4 h-4 text-primary" />
        <h2 className="font-bold text-foreground">Limits for {name}</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        You can be stricter than the law — Blockwork always applies whichever limit is tighter. Neighbors only ever
        see "Not available at that time."
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Max hours per week</Label>
          <Input
            className="rounded-xl mt-1"
            type="number"
            min="1"
            max="40"
            placeholder="No limit"
            value={limits.max_hours_per_week}
            onChange={(e) => set("max_hours_per_week", e.target.value)}
          />
        </div>
        <div>
          <Label>Max distance (miles)</Label>
          <Input
            className="rounded-xl mt-1"
            type="number"
            min="1"
            max="25"
            placeholder="No limit"
            value={limits.max_distance_miles}
            onChange={(e) => set("max_distance_miles", e.target.value)}
          />
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
                  on
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40",
                )}
              >
                {d.label}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          Leave all off to allow any day.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Not before</Label>
          <select
            className="mt-1 h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm text-foreground"
            value={limits.earliest_hour}
            onChange={(e) => set("earliest_hour", e.target.value)}
          >
            <option value="">Any time</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>{fmtHour(h)}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Not after</Label>
          <select
            className="mt-1 h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm text-foreground"
            value={limits.latest_hour}
            onChange={(e) => set("latest_hour", e.target.value)}
          >
            <option value="">Any time</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>{fmtHour(h)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-secondary p-3.5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">No jobs on school nights</p>
          <p className="text-[11px] text-muted-foreground">Sunday–Thursday after 6 PM.</p>
        </div>
        <Switch
          checked={limits.no_school_nights}
          onCheckedChange={(v) => set("no_school_nights", v)}
        />
      </div>

      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
      <Button className="w-full rounded-full" disabled={saving} onClick={save}>
        {saving ? "Saving…" : <><Save className="w-4 h-4 mr-2" /> {saved ? "Saved" : "Save limits"}</>}
      </Button>
    </div>
  );
}