import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Repeat, Pause, Play, SkipForward, XCircle, CalendarDays } from "lucide-react";

// Shows on BookingDetail when the booking is part of a recurring series.
// Lets either party pause, skip the next occurrence, or cancel the series.
export default function RecurringSeriesManager({ booking, user, onChanged }) {
  const [series, setSeries] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!booking?.recurring_series_id) { setLoading(false); return; }
      try {
        const res = await base44.entities.RecurringSeries.filter({ id: booking.recurring_series_id });
        setSeries(res[0] || null);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [booking?.recurring_series_id]);

  const act = async (action) => {
    setActing(true);
    setError("");
    try {
      await base44.functions.invoke("manageRecurringSeries", { seriesId: booking.recurring_series_id, action });
      const res = await base44.entities.RecurringSeries.filter({ id: booking.recurring_series_id });
      setSeries(res[0] || null);
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't update the series.");
    }
    setActing(false);
  };

  if (loading || !series) return null;

  const formatNext = (iso) => {
    if (!iso) return "soon";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const isActive = series.status === "active";
  const isPaused = series.status === "paused";

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Repeat className="w-4 h-4 text-primary" />
        <p className="font-bold text-foreground text-[14px]">
          {series.recurrence === "weekly" ? "Weekly" : series.recurrence === "biweekly" ? "Biweekly" : "Monthly"} series
        </p>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
          isActive ? "bg-emerald-50 text-emerald-600" :
          isPaused ? "bg-amber-50 text-amber-600" :
          "bg-red-50 text-red-600"
        }`}>
          {series.status}
        </span>
      </div>

      {isActive && (
        <p className="text-[12px] text-muted-foreground flex items-center gap-1">
          <CalendarDays className="w-3 h-3" /> Next occurrence: {formatNext(series.next_occurrence_at)}
        </p>
      )}

      {isPaused && (
        <p className="text-[12px] text-amber-600">
          Paused — no new occurrences until you resume.
        </p>
      )}

      {series.status === "cancelled" && (
        <p className="text-[12px] text-red-600">
          Cancelled — no future occurrences will be generated.
        </p>
      )}

      {(isActive || isPaused) && (
        <div className="grid grid-cols-3 gap-2">
          {isActive ? (
            <Button variant="outline" size="sm" className="rounded-xl text-[12px]" disabled={acting} onClick={() => act("pause")}>
              <Pause className="w-3.5 h-3.5" /> Pause
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="rounded-xl text-[12px]" disabled={acting} onClick={() => act("resume")}>
              <Play className="w-3.5 h-3.5" /> Resume
            </Button>
          )}
          {isActive && (
            <Button variant="outline" size="sm" className="rounded-xl text-[12px]" disabled={acting} onClick={() => act("skip")}>
              <SkipForward className="w-3.5 h-3.5" /> Skip next
            </Button>
          )}
          <Button variant="outline" size="sm" className="rounded-xl text-[12px] text-destructive border-destructive/20 hover:bg-destructive/10" disabled={acting} onClick={() => act("cancel")}>
            <XCircle className="w-3.5 h-3.5" /> Cancel
          </Button>
        </div>
      )}

      {error && <p className="text-[11px] text-destructive font-medium text-center">{error}</p>}
    </div>
  );
}