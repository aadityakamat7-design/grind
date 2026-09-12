import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { Clock, Loader2 } from "lucide-react";

const pad = (h) => String(h).padStart(2, "0");
const weekday = (start, end) =>
  [1, 2, 3, 4, 5].map((day) => ({ day, start: `${pad(start)}:00`, end: `${pad(end)}:00` }));
const weekend = (start, end) =>
  [0, 6].map((day) => ({ day, start: `${pad(start)}:00`, end: `${pad(end)}:00` }));

// One-tap weekly availability presets. Tapping adds that preset's recurring
// slots to the profile; tapping again removes them. Teen slots are clamped to
// legal work hours when hourLimits is provided.
const PRESETS = [
  { key: "after_school", label: "After school", icon: "🎒", slots: weekday(15, 18) },
  { key: "weekday_evenings", label: "Weekday evenings", icon: "🌙", slots: weekday(17, 20) },
  { key: "weekends", label: "Weekends", icon: "📅", slots: weekend(9, 17) },
  { key: "weekend_evenings", label: "Weekend evenings", icon: "🌆", slots: weekend(17, 20) },
];

const slotKey = (s) => `${s.day}-${s.start}-${s.end}`;

function clampSlots(slots, limits) {
  if (!limits) return slots;
  const earliest = Math.floor(limits.earliestStartHour ?? 0);
  const latest = Math.floor(limits.latestEndHour ?? 24);
  return slots
    .map((s) => {
      const startH = parseInt(s.start, 10);
      const endH = parseInt(s.end, 10);
      const cs = Math.max(startH, earliest);
      const ce = Math.min(endH, latest);
      if (cs >= ce) return null;
      return { day: s.day, start: `${pad(cs)}:00`, end: `${pad(ce)}:00` };
    })
    .filter(Boolean);
}

export default function AvailabilityPresets({ profile, entityName, hourLimits, onChanged }) {
  const [availability, setAvailability] = useState(profile?.availability || []);
  const [saving, setSaving] = useState(false);

  const isActive = (preset) => {
    const valueKeys = new Set((availability || []).map(slotKey));
    return preset.slots.every((s) => valueKeys.has(slotKey(s)));
  };

  const toggle = async (preset) => {
    const valueKeys = new Set((availability || []).map(slotKey));
    const active = preset.slots.every((s) => valueKeys.has(slotKey(s)));
    let next;
    if (active) {
      next = (availability || []).filter((s) => !preset.slots.some((ps) => slotKey(ps) === slotKey(s)));
    } else {
      const toAdd = clampSlots(preset.slots, hourLimits).filter((s) => !valueKeys.has(slotKey(s)));
      next = [...(availability || []), ...toAdd];
    }
    const prev = availability;
    setAvailability(next); // optimistic
    setSaving(true);
    try {
      await base44.entities[entityName].update(profile.id, { availability: next });
      onChanged?.();
    } catch (err) {
      setAvailability(prev); // revert
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">When are you free?</span>
        </div>
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
      </div>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => toggle(preset)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 h-9 text-[13px] font-semibold transition-all active:scale-[0.97]",
              isActive(preset)
                ? "bg-primary text-primary-foreground shadow-soft"
                : "bg-secondary text-secondary-foreground border border-border hover:border-primary/40"
            )}
          >
            <span className="text-[15px] leading-none">{preset.icon}</span>
            {preset.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3">Tap a preset to add it — tap again to remove.</p>
    </div>
  );
}