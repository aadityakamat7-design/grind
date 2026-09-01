import React, { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Clock, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00",
];

// Accepts and returns a "YYYY-MM-DDTHH:mm" datetime-local string so existing
// booking/job-post logic keeps working unchanged.
export default function DateTimePicker({ value, onChange, className }) {
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
    emit(d, selectedTime);
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
          disabled={{ before: today }}
          initialFocus
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Clock className="w-3.5 h-3.5" /> Choose a time
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {TIME_SLOTS.map((slot) => {
            const label = new Date(`2000-01-01T${slot}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
            const active = selectedTime === slot;
            return (
              <button
                key={slot}
                type="button"
                onClick={() => handleTime(slot)}
                className={cn(
                  "h-9 rounded-lg text-xs font-semibold transition-all duration-200 ease-ios",
                  active
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "bg-secondary text-foreground hover:bg-secondary/70"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}