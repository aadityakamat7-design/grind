import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Check, ShieldAlert, Unlock, X, Loader2 } from "lucide-react";
import { format } from "date-fns";

// The admin queue for every flagged message. Urgent (high severity) items sit on
// top. Admins can release a held message, confirm a block, clear a false alarm,
// or lift a sender's messaging suspension — every decision is audit-logged by
// the moderationAction function.
const SEVERITY_STYLE = {
  high: "border-rose-300 bg-rose-50",
  medium: "border-amber-300 bg-amber-50",
  low: "border-border bg-card",
};

export default function FlaggedMessageQueue({ onReload }) {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState("");
  const [notes, setNotes] = useState({});

  const load = async () => {
    try {
      const rows = await base44.entities.MessageFlag.list("-created_date", 100);
      const ordered = [...rows].sort((a, b) => {
        if (!!b.urgent !== !!a.urgent) return (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0);
        if (a.status !== b.status) return a.status === "open" ? -1 : 1;
        return new Date(b.created_date) - new Date(a.created_date);
      });
      setFlags(ordered);
    } catch (err) {
      console.error("flagged message queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const act = async (flag, action) => {
    setActing(`${flag.id}-${action}`);
    try {
      await base44.functions.invoke("moderationAction", {
        flagId: flag.id,
        action,
        note: notes[flag.id] || "",
      });
      await load();
      onReload?.();
    } catch (err) {
      console.error("moderation action:", err);
    } finally {
      setActing("");
    }
  };

  if (loading) return <div className="bg-card rounded-2xl border border-border h-40 skeleton-shimmer" />;

  const open = flags.filter((f) => f.status === "open");
  const handled = flags.filter((f) => f.status !== "open");

  return (
    <div className="space-y-4">
      {open.length > 0 && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-300 bg-rose-50 p-3.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700">
            <strong className="font-bold">NCMEC:</strong> any sexual content involving a minor must be reported to the
            National Center for Missing &amp; Exploited Children at report.cybertip.org. Preserve the message
            (do not delete the flagged record) before resolving this case.
          </p>
        </div>
      )}

      {open.length === 0 && (
        <div className="bg-card rounded-2xl border border-border p-6 text-center">
          <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No flagged messages waiting.</p>
        </div>
      )}

      {[...open, ...handled].map((f) => (
        <div
          key={f.id}
          className={`rounded-2xl border shadow-soft p-4 space-y-2.5 ${SEVERITY_STYLE[f.severity] || SEVERITY_STYLE.low} ${f.status !== "open" ? "opacity-60" : ""}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wide rounded-full bg-foreground/10 px-2 py-0.5">
                  {f.severity}
                </span>
                {f.urgent && (
                  <span className="text-[10px] font-bold uppercase tracking-wide rounded-full bg-rose-600 text-white px-2 py-0.5">
                    Urgent
                  </span>
                )}
                {f.self_harm && (
                  <span className="text-[10px] font-bold uppercase tracking-wide rounded-full bg-amber-500 text-white px-2 py-0.5">
                    Self-harm
                  </span>
                )}
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {f.action_taken}
                </span>
                {f.status !== "open" && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                    {f.resolution}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                From <strong className="font-semibold">{f.sender_name || f.sender_id}</strong>
                {f.teen_user_id ? ` → teen ${f.teen_user_id.slice(0, 8)}…` : ""} ·{" "}
                {f.created_date ? format(new Date(f.created_date), "MMM d, h:mm a") : ""}
              </p>
            </div>
            <Link to={`/messages/${f.thread_id}`} className="text-[11px] font-semibold text-primary hover:underline shrink-0">
              Open thread
            </Link>
          </div>

          {f.excerpt && (
            <p className="text-sm text-foreground bg-card/70 rounded-xl p-2.5 border border-border">
              "{f.excerpt}"
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            Matched: {(f.categories || []).join(", ") || "—"}
            {f.reason ? ` · ${f.reason}` : ""}
          </p>

          {f.status === "open" && (
            <>
              <input
                className="w-full rounded-xl border border-border bg-card px-3 h-10 text-sm text-foreground"
                placeholder="Optional note for the audit log"
                value={notes[f.id] || ""}
                onChange={(e) => setNotes((prev) => ({ ...prev, [f.id]: e.target.value }))}
              />
              <div className="flex flex-wrap gap-2">
                {f.action_taken === "held" && (
                  <Button size="sm" className="rounded-xl text-xs" disabled={!!acting} onClick={() => act(f, "approve")}>
                    {acting === `${f.id}-approve` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5 mr-1.5" /> Release to recipient</>}
                  </Button>
                )}
                <Button size="sm" variant="destructive" className="rounded-xl text-xs" disabled={!!acting} onClick={() => act(f, "block")}>
                  {acting === `${f.id}-block` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><X className="w-3.5 h-3.5 mr-1.5" /> Confirm block</>}
                </Button>
                <Button size="sm" variant="outline" className="rounded-xl text-xs" disabled={!!acting} onClick={() => act(f, "clear")}>
                  <ShieldAlert className="w-3.5 h-3.5 mr-1.5" /> No real risk
                </Button>
                {f.severity === "high" && (
                  <Button size="sm" variant="outline" className="rounded-xl text-xs" disabled={!!acting} onClick={() => act(f, "lift_suspension")}>
                    <Unlock className="w-3.5 h-3.5 mr-1.5" /> Lift messaging suspension
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}