import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ShieldAlert, Flag } from "lucide-react";

// Read-only review surface for a booking: every message between the parties,
// which ones were flagged, and any safety reports tied to the booking. Admins
// can read but never edit the text — removal is handled elsewhere.
export default function AdminBookingThread({ booking, reports }) {
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const { items } = await base44.entities.MessageThread.filter(
          { booking_id: booking.id },
          { limit: 1 }
        );
        const found = items?.[0];
        if (!alive) return;
        if (!found) {
          setThread(null);
          setMessages([]);
          return;
        }
        setThread(found);
        const page = await base44.entities.Message.filter(
          { thread_id: found.id },
          { sort: "created_date", limit: 100 }
        );
        if (alive) setMessages(page.items || []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [booking.id]);

  const tied = (reports || []).filter((r) => r.booking_id === booking.id);
  const flagged = messages.filter((m) => m.flagged || m.pii_masked);

  return (
    <div className="space-y-4">
      <div>
        <p className="font-bold text-foreground text-sm mb-2">Messages between the parties</p>
        {loading && <p className="text-xs text-muted-foreground">Loading the thread…</p>}
        {!loading && !thread && (
          <p className="text-xs text-muted-foreground">No message thread for this booking.</p>
        )}
        {!loading && thread && (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground">The thread is empty.</p>
            )}
            {messages.map((m) => (
              <div key={m.id} className="bg-secondary rounded-xl p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold text-foreground">{m.sender_name || m.sender_id}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {m.created_date ? new Date(m.created_date).toLocaleString() : ""}
                  </p>
                </div>
                <p className="text-xs text-foreground mt-1 whitespace-pre-wrap break-words">{m.body}</p>
                {(m.flagged || m.pii_masked) && (
                  <p className="text-[10px] text-amber-700 mt-1 font-semibold">
                    {m.flagged ? "Flagged by screening" : "Contact details masked"}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        {flagged.length > 0 && (
          <p className="text-[11px] text-amber-700 mt-2">
            {flagged.length} message{flagged.length > 1 ? "s" : ""} flagged or masked in this thread.
          </p>
        )}
      </div>

      <div>
        <p className="font-bold text-foreground text-sm mb-2 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4" /> Safety reports on this booking
        </p>
        {tied.length === 0 ? (
          <p className="text-xs text-muted-foreground">No reports tied to this booking.</p>
        ) : (
          <div className="space-y-2">
            {tied.map((r) => (
              <div key={r.id} className="bg-rose-50 border border-rose-200 rounded-xl p-2.5">
                <p className="text-[11px] font-bold text-rose-800 flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5" />
                  {String(r.reason || "").replace(/_/g, " ")} · {r.status}
                </p>
                {r.details && <p className="text-xs text-rose-700 mt-1">{r.details}</p>}
                <p className="text-[10px] text-rose-700/80 mt-1">
                  From {r.reporter_name || r.reporter_id} about {r.subject_name || r.subject_id}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}