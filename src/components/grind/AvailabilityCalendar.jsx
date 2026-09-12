import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { DAY_LABELS, WEEKDAY_ORDER } from "@/lib/availability";

// Default hour window for neighbors (no school-hour restrictions).
const BUYER_LIMITS = {
  earliestStartHour: 7,
  latestEndHour: 21,
  prohibitedDuringSchoolHours: false,
  schoolHoursStart: 8,
  schoolHoursEnd: 15,
};

// Convert array of { day, start, end } ranges into a Set of "day-hour" keys.
function rangesToBlocks(ranges) {
  const set = new Set();
  (ranges || []).forEach((r) => {
    const startH = parseInt(r.start, 10);
    const endH = parseInt(r.end, 10);
    if (isNaN(startH) || isNaN(endH)) return;
    for (let h = startH; h < endH; h++) set.add(`${r.day}-${h}`);
  });
  return set;
}

// Convert a Set of "day-hour" keys back into contiguous { day, start, end } ranges.
function blocksToRanges(set) {
  const byDay = {};
  set.forEach((key) => {
    const [day, hour] = key.split("-").map(Number);
    (byDay[day] = byDay[day] || []).push(hour);
  });
  const ranges = [];
  Object.keys(byDay).forEach((day) => {
    const hours = byDay[day].sort((a, b) => a - b);
    let start = hours[0];
    let prev = hours[0];
    for (let i = 1; i <= hours.length; i++) {
      if (i === hours.length || hours[i] !== prev + 1) {
        ranges.push({
          day: Number(day),
          start: `${String(start).padStart(2, "0")}:00`,
          end: `${String(prev + 1).padStart(2, "0")}:00`,
        });
        if (i < hours.length) start = hours[i];
      }
      prev = i < hours.length ? hours[i] : prev;
    }
  });
  return ranges;
}

function formatHourLabel(h) {
  const suffix = h >= 12 ? "pm" : "am";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}${suffix}`;
}

// Weekly grid calendar. Tap any hour block on any day to toggle availability.
// For teens, school hours and legally off-limit times are grayed out.
export default function AvailabilityCalendar({ value = [], onChange, hourLimits }) {
  const limits = hourLimits || BUYER_LIMITS;
  const blocks = useMemo(() => rangesToBlocks(value), [value]);

  const allHours = useMemo(() => {
    const min = Math.floor(limits.earliestStartHour ?? 0);
    const max = Math.floor(limits.latestEndHour ?? 24);
    const hours = [];
    for (let h = min; h < max; h++) hours.push(h);
    return hours;
  }, [limits]);

  const isAllowed = (day, hour) => {
    const earliest = Math.floor(limits.earliestStartHour ?? 0);
    const latest = Math.floor(limits.latestEndHour ?? 24);
    if (hour < earliest || hour >= latest) return false;
    if (limits.prohibitedDuringSchoolHours) {
      const isWeekday = day >= 1 && day <= 5;
      const isAdult = (limits.latestEndHour ?? 0) >= 24;
      if (isWeekday && !isAdult && hour >= (limits.schoolHoursStart ?? 8) && hour < (limits.schoolHoursEnd ?? 15)) {
        return false;
      }
    }
    return true;
  };

  const toggle = (day, hour) => {
    if (!isAllowed(day, hour)) return;
    const key = `${day}-${hour}`;
    const next = new Set(blocks);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(blocksToRanges(next));
  };

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div className="min-w-[480px]">
        {/* Day headers */}
        <div className="grid grid-cols-[44px_repeat(7,1fr)] gap-1 mb-1.5">
          <div />
          {WEEKDAY_ORDER.map((day) => (
            <div key={day} className="text-center text-[11px] font-semibold text-muted-foreground py-1">
              {DAY_LABELS[day]}
            </div>
          ))}
        </div>
        {/* Hour rows */}
        {allHours.map((hour) => (
          <div key={hour} className="grid grid-cols-[44px_repeat(7,1fr)] gap-1 mb-1">
            <div className="text-[10px] text-muted-foreground text-right pr-1.5 flex items-center justify-end leading-none">
              {formatHourLabel(hour)}
            </div>
            {WEEKDAY_ORDER.map((day) => {
              const allowed = isAllowed(day, hour);
              const selected = blocks.has(`${day}-${hour}`);
              return (
                <button
                  key={day}
                  type="button"
                  disabled={!allowed}
                  onClick={() => toggle(day, hour)}
                  className={cn(
                    "h-7 rounded-lg transition-colors",
                    !allowed && "bg-muted/50 cursor-not-allowed",
                    allowed && !selected && "bg-card border border-border hover:border-primary/50 hover:bg-primary/5",
                    selected && "bg-primary border border-primary shadow-soft"
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}