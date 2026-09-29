import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { money } from "@/lib/grind";

// Reads the immutable admin audit log. Every support action lands here with the
// admin, the reason, and the values before and after. Entries can never be
// edited or deleted — not even by an admin — so this is the record of record.
const PAGE = 25;

export default function AdminAuditLogPanel({ bookingId, userId, showTitle = true }) {
  const [rows, setRows] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const query = bookingId
    ? { booking_id: bookingId }
    : userId
      ? { subject_user_id: userId }
      : {};

  const load = useCallback(async (nextCursor) => {
    setLoading(true);
    try {
      const { items, next_cursor, has_more } = await base44.entities.AdminAuditLog.filter(
        query,
        { sort: "-created_date", limit: PAGE, cursor: nextCursor }
      );
      setRows((prev) => (nextCursor ? [...prev, ...items] : items));
      setCursor(next_cursor);
      setHasMore(has_more);
    } finally {
      setLoading(false);
    }
  }, [bookingId, userId]);

  // A new booking/user scope starts a fresh page rather than appending.
  useEffect(() => { load(null); }, [load]);

  const scopeLabel = bookingId ? "this booking" : userId ? "this user" : "any booking or account";

  return (
    <div className="space-y-3">
      {showTitle && (
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Admin audit log — {scopeLabel}
          </p>
        </div>
      )}

      {loading && rows.length === 0 && (
        <p className="text-xs text-muted-foreground">Loading the audit log…</p>
      )}

      {!loading && rows.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No admin actions recorded {scopeLabel}. Support changes are logged here automatically.
        </p>
      )}

      <div className="space-y-2">
        {rows.map((r) => (
          <AuditRow key={r.id} entry={r} />
        ))}
      </div>

      {hasMore && (
        <Button size="sm" variant="outline" disabled={loading} onClick={() => load(cursor)}>
          {loading ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}

function AuditRow({ entry }) {
  const diffs = changedKeys(entry.before, entry.after);

  return (
    <div className="bg-secondary rounded-xl p-3 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold text-foreground">
          {String(entry.action || "").replace(/_/g, " ")}
        </p>
        <p className="text-[11px] text-muted-foreground whitespace-nowrap">
          {entry.created_date ? new Date(entry.created_date).toLocaleString() : ""}
        </p>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {entry.admin_name || entry.admin_email || entry.admin_user_id}
        {entry.summary ? ` — ${entry.summary}` : ""}
      </p>

      <p className="text-[11px] text-muted-foreground">
        <span className="font-semibold text-foreground">Reason:</span>{" "}
        {String(entry.reason_code || "").replace(/_/g, " ")}
        {entry.reason_note ? ` — ${entry.reason_note}` : ""}
      </p>

      {Number(entry.refund_amount) > 0 && (
        <p className="text-[11px] font-semibold text-foreground">
          Refunded {money(entry.refund_amount)}
        </p>
      )}

      {diffs.length > 0 && (
        <div className="pt-1 border-t border-border/60 space-y-0.5">
          {diffs.map((d) => (
            <p key={d.key} className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-foreground">{d.key.replace(/_/g, " ")}</span>
              <span>{format(d.before)}</span>
              <ArrowRight className="w-3 h-3 shrink-0" />
              <span className="font-semibold text-foreground">{format(d.after)}</span>
            </p>
          ))}
        </div>
      )}

      {entry.requester_verified && (
        <p className="text-[11px] text-emerald-700 font-semibold">
          Requester verified as the account owner
        </p>
      )}
    </div>
  );
}

function format(v) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "number") return String(v);
  return String(v).slice(0, 60);
}

// Only the fields that actually changed, so the row stays readable.
function changedKeys(before, after) {
  const b = before || {};
  const a = after || {};
  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
  const out = [];
  for (const key of keys) {
    const bv = b[key];
    const av = a[key];
    if (JSON.stringify(bv ?? null) !== JSON.stringify(av ?? null)) {
      out.push({ key, before: bv, after: av });
    }
  }
  return out.slice(0, 6);
}