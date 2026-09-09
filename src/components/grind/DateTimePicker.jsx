import React, { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Clock, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLegalSlotsForDate, getAvailabilitySlotForDate } from "@/lib/availability";

// Accepts and returns a "YYYY-MM-DDTHH:mm" datetime-local string.
// When `availability` and `hourLimits` are provided, only legal times
// within the teen's set availability are shown — school hours are
// automatically excluded on school days for minors.
export default function DateTimePicker({ value, onChange, className, availability, hourLimits }) {
  const parsed = useMemo(() => {
    if (!value) return { date: undefined, time: "" };
    const d = new Date(value);
    if (isNaN(d.getTime())) return { date: undefined, time: "" };
    const pad = (n) => String(n).padStart(2, "0");
    return {
      date: d,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    };
  }, [value]);

  const [selectedDate, setSelectedDate] = useState(parsed.date);
  const [selectedTime, setSelectedTime] = useState(parsed.time);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const availableSlots = useMemo(() => {
    if (!selectedDate) return [];
    const legalSlots = getLegalSlotsForDate(selectedDate, hourLimits);
    if (!availability || availability.length === 0) return legalSlots;
    const availSlot = getAvailabilitySlotForDate(selectedDate, availability);
    if (!availSlot) return [];
    const [startH] = availSlot.start.split(":").map(Number);
    const [endH] = availSlot.end.split(":").map(Number);
    return legalSlots.filter((s) => s.hour >= startH && s.hour < endH);
  }, [selectedDate, availability, hourLimits]);

  const emit = (date, time) => {
    if (!date || !time) return;
    const [h, m] = time.split(":").map(Number);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    const pad = (n) => String(n).padStart(2, "0");
    onChange(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(h)}:${pad(m)}`);
  };

  const handleDate = (d) => {
    setSelectedDate(d);
    setSelectedTime("");
    onChange("");
  };

  const handleTime = (t) => {
    setSelectedTime(t);
    emit(selectedDate, t);
  };

  const clear = () => {
    setSelectedDate(undefined);
    setSelectedTime("");
    onChange("");
  };

  const formatted = useMemo(() => {
    if (!selectedDate) return "Pick a date and time";
    const opts = { weekday: "short", month: "short", day: "numeric" };
    const dateStr = selectedDate.toLocaleDateString("en-US", opts);
    const timeStr = selectedTime
      ? new Date(`2000-01-01T${selectedTime}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      : "";
    return timeStr ? `${dateStr} · ${timeStr}` : dateStr;
  }, [selectedDate, selectedTime]);

  const isDateDisabled = (date) => {
    if (availability && availability.length > 0) {
      const day = date.getDay();
      if (!availability.some((a) => a.day === day)) return true;
    }
    return false;
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5" /> {formatted}
        </Label>
        {value && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clear}>
            Clear
          </Button>
        )}
      </div>

      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDate}
          disabled={[{ before: today }, isDateDisabled]}
          initialFocus
        />
      </div>

      {selectedDate && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            {availableSlots.length > 0
              ? "Choose a time"
              : "No available times this day"}
          </div>
          {availableSlots.length > 0 && (
            <div className="grid grid-cols-4 gap-1.5">
              {availableSlots.map((slot) => {
                const active = selectedTime === slot.value;
                return (
                  <button
                    key={slot.value}
                    type="button"
                    onClick={() => handleTime(slot.value)}
                    className={cn(
                      "h-9 rounded-lg text-xs font-semibold transition-all duration-200 ease-ios",
                      active
                        ? "bg-primary text-primary-foreground shadow-glow"
                        : "bg-secondary text-foreground hover:bg-secondary/70"
                    )}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}