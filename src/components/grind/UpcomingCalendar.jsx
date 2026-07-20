import React from "react";
import { format, isToday, isTomorrow } from "date-fns";
import BookingCard from "@/components/grind/BookingCard";

function dayLabel(date) {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, MMM d");
}

export default function UpcomingCalendar({ bookings }) {
  const scheduled = bookings
    .filter((b) => b.scheduled_start)
    .sort((a, b) => new Date(a.scheduled_start) - new Date(b.scheduled_start));
  const unscheduled = bookings.filter((b) => !b.scheduled_start);

  const groups = [];
  for (const b of scheduled) {
    const key = format(new Date(b.scheduled_start), "yyyy-MM-dd");
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(b);
    else groups.push({ key, date: new Date(b.scheduled_start), items: [b] });
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.key}>
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-2">{dayLabel(g.date)}</p>
          <div className="space-y-3">
            {g.items.map((b) => <BookingCard key={b.id} booking={b} perspective="teen" />)}
          </div>
        </div>
      ))}
      {unscheduled.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">No date set</p>
          <div className="space-y-3">
            {unscheduled.map((b) => <BookingCard key={b.id} booking={b} perspective="teen" />)}
          </div>
        </div>
      )}
    </div>
  );
}