import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { DAY_LABELS, WEEKDAY_ORDER, getLegalSlotsForDayOfWeek } from "@/lib/availability";

export default function AvailabilityPicker({ value = [], onChange, hourLimits }) {
  const slots = Array.isArray(value) ? value : [];

  const getSlot = (day) => slots.find((s) => s.day === day);

  const toggleDay = (day) => {
    const existing = getSlot(day);
    if (existing) {
      onChange(slots.filter((s) => s.day !== day));
    } else {
      const legal = getLegalSlotsForDayOfWeek(day, hourLimits);
      const defaultStart = legal[0]?.value || "15:00";
      const defaultEnd = legal.length > 1 ? legal[legal.length - 1].value : defaultStart;
      onChange([...slots, { day, start: defaultStart, end: defaultEnd }]);
    }
  };

  const updateSlot = (day, field, val) => {
    onChange(
      slots.map((s) => {
        if (s.day !== day) return s;
        const updated = { ...s, [field]: val };
        if (field === "start") {
          const startH = parseInt(val);
          const endH = parseInt(updated.end);
          if (endH <= startH) {
            const legal = getLegalSlotsForDayOfWeek(day, hourLimits);
            const next = legal.find((sl) => sl.hour > startH);
            if (next) updated.end = next.value;
          }
        }
        return updated;
      })
    );
  };

  return (
    <div className="space-y-1.5">
      {WEEKDAY_ORDER.map((day) => {
        const slot = getSlot(day);
        const legal = getLegalSlotsForDayOfWeek(day, hourLimits);
        const enabled = !!slot;
        const isWeekday = day >= 1 && day <= 5;
        const startH = slot ? parseInt(slot.start) : 0;
        const endOptions = legal.filter((s) => s.hour > startH);
        const endValid = endOptions.some((s) => s.value === slot?.end);

        return (
          <div
            key={day}
            className={cn(
              "rounded-xl border p-2.5 transition-colors",
              enabled ? "border-primary/30 bg-primary/5" : "border-border bg-card"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => toggleDay(day)}
                className="flex items-center gap-2 shrink-0"
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
                    enabled ? "bg-primary border-primary" : "border-muted-foreground/30"
                  )}
                >
                  {enabled && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                <span className="text-sm font-medium">{DAY_LABELS[day]}</span>
                {isWeekday && enabled && (
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">after school</span>
                )}
              </button>
              {enabled && legal.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <select
                    value={slot.start}
                    onChange={(e) => updateSlot(day, "start", e.target.value)}
                    className="text-xs rounded-lg border border-border bg-background px-2 py-1.5"
                  >
                    {legal.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-muted-foreground">–</span>
                  <select
                    value={slot.end}
                    onChange={(e) => updateSlot(day, "end", e.target.value)}
                    className="text-xs rounded-lg border border-border bg-background px-2 py-1.5"
                  >
                    {endOptions.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                    {!endValid && <option value={slot.end}>{slot.end}</option>}
                  </select>
                </div>
              )}
            </div>
          </div>
        );
      })}
      {slots.length === 0 && (
        <p className="text-xs text-muted-foreground pt-1">
          Pick at least one day you're available to work.
        </p>
      )}
    </div>
  );
}