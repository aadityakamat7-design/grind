import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ShieldAlert, ShieldCheck, MessageSquare, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";

// Every flagged message involving this parent's teen, and what happened to it.
// The message text itself is never shown here — the parent reads the thread.
const SEVERITY_STYLE = {
  high: "bg-rose-50 border-rose-200 text-rose-700",
  medium: "bg-amber-50 border-amber-200 text-amber-700",
  low: "bg-secondary border-border text-muted-foreground",
};

const ACTION_TEXT = {
  blocked: "Blocked — our safety team was alerted.",
  held: "Held for review before it could be delivered.",
  masked: "Contact details were hidden; the rest was delivered.",
  delivered: "Delivered and flagged for your awareness.",
};

const RESOLUTION_TEXT = {
  approved: "Reviewed and released.",
  blocked: "Reviewed and confirmed blocked.",
  cleared: "Reviewed — no real risk.",
};

export default function FlaggedMessagesCard({ userId, teenNames = {} }) {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const rows = await base44.entities.MessageFlag.filter(
          { parent_user_id: userId },
          "-created_date",
          25,
        );
        setFlags(rows);
      } catch (err) {
        console.error("flagged messages load:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) return <div className="bg-card rounded-2xl border border-border h-28 skeleton-shimmer" />;

  return (
    <div>
      <h2 className="font-bold text-foreground mb-3 flex items-center gap-1.5">
        <ShieldAlert className="w-4 h-4 text-muted-foreground" /> Flagged messages
      </h2>

      {flags.length === 0 ? (
        <div className="flex items-start gap-3 bg-card rounded-2xl border border-border p-4">
          <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Nothing flagged. Every message in {Object.values(teenNames)[0]?.split(" ")[0] || "your teen"}'s
            conversations is screened automatically before it's delivered.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {flags.map((f) => (
            <Link
              key={f.id}
              to={`/messages/${f.thread_id}`}
              className={`block rounded-2xl border p-3.5 transition-colors hover:opacity-90 ${SEVERITY_STYLE[f.severity] || SEVERITY_STYLE.low}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold">
                    {f.self_harm
                      ? "A message about self-harm"
                      : `${f.severity === "high" ? "High" : f.severity === "medium" ? "Medium" : "Low"} risk message`}
                  </p>
                  <p className="text-xs mt-0.5">
                    From {f.sender_name || "a user"} · {ACTION_TEXT[f.action_taken] || f.action_taken}
                  </p>
                  {f.status === "handled" && f.resolution !== "none" && (
                    <p className="text-[11px] mt-1 opacity-80">
                      {RESOLUTION_TEXT[f.resolution] || f.resolution}
                      {f.resolution_note ? ` — ${f.resolution_note}` : ""}
                    </p>
                  )}
                  <p className="text-[11px] mt-1 opacity-70">
                    {f.created_date ? format(new Date(f.created_date), "MMM d, h:mm a") : ""}
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 shrink-0 opacity-60" />
              </div>
              {f.status === "open" && (
                <p className="text-[11px] mt-1.5 font-semibold flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Our safety team is reviewing this.
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}