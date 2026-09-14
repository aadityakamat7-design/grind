import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Repeat, CalendarDays, ChevronRight } from "lucide-react";

// Shows a user's active recurring series on their dashboard.
// "Weekly lawn care with Maya R., next on [date]"
export default function RecurringSeriesCard({ user }) {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [asBuyer, asTeen] = await Promise.all([
          base44.entities.RecurringSeries.filter({ buyer_user_id: user.id, status: "active" }),
          base44.entities.RecurringSeries.filter({ teen_user_id: user.id, status: "active" }),
        ]);
        // Deduplicate in case the user is both buyer and teen (shouldn't happen but safe)
        const seen = new Set();
        const all = [...asBuyer, ...asTeen].filter((s) => {
          if (seen.has(s.id)) return false;
          seen.add(s.id);
          return true;
        });
        setSeries(all);
      } catch {
        // silent — don't block the dashboard
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) load();
  }, [user?.id]);

  if (loading || series.length === 0) return null;

  const formatNext = (iso) => {
    if (!iso) return "scheduled soon";
    const d = new Date(iso);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const h = d.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()} at ${h12}:${d.getMinutes().toString().padStart(2, "0")} ${ampm}`;
  };

  const isTeen = series[0]?.teen_user_id === user.id;

  return (
    <div className="space-y-2.5">
      {series.map((s) => (
        <Link
          key={s.id}
          to="/bookings"
          className="block bg-card rounded-2xl border border-border shadow-soft p-4 hover:shadow-card transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Repeat className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-foreground text-[14px] truncate">
                {s.recurrence === "weekly" ? "Weekly" : s.recurrence === "biweekly" ? "Biweekly" : "Monthly"} {s.listing_title?.toLowerCase()}
              </p>
              <p className="text-[12px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                {isTeen ? `with ${s.buyer_name}` : `with ${s.teen_display_name}`} · next on {formatNext(s.next_occurrence_at)}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>
        </Link>
      ))}
    </div>
  );
}