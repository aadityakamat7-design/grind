import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import {
  Search, Download, RefreshCw, AlertTriangle, CheckCircle2, ArrowLeft, Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/grind/StatusBadge";
import { money } from "@/lib/grind";
import { toCsv, downloadCsv } from "@/lib/csv";
import AdminPaymentLiveCheck from "./AdminPaymentLiveCheck";

const PAYMENT_STATUSES = ["all", "unpaid", "held", "releasing", "released", "refunded", "payment_failed"];

const CSV_COLUMNS = [
  { key: "at", label: "Date" },
  { key: "title", label: "Job" },
  { key: "buyer_name", label: "Neighbor" },
  { key: "teen_name", label: "Teen" },
  { key: "charge_amount", label: "Charged" },
  { key: "admin_refund_amount", label: "Refunded" },
  { key: "platform_fee", label: "Platform fee" },
  { key: "net_amount", label: "Net to teen" },
  { key: "tip_amount", label: "Tip" },
  { key: "payment_status", label: "Payment status" },
  { key: "payout_status", label: "Payout status" },
  { key: "booking_status", label: "Booking status" },
  { key: "payment_intent_id", label: "Stripe payment intent" },
  { key: "transfer_id", label: "Stripe transfer" },
  { key: "flags", label: "Flagged" },
];

// Payment history for support: every charge, refund, tip and payout the app
// recorded, filterable and exportable, with a live Stripe check per booking.
// All filtering, counting and totals come from the server.
export default function AdminPaymentHistory() {
  const [scope, setScope] = useState("ledger");
  const [userId, setUserId] = useState("");
  const [userLabel, setUserLabel] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [mismatchesOnly, setMismatchesOnly] = useState(false);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [liveBusy, setLiveBusy] = useState("");
  const [liveData, setLiveData] = useState(null);

  const params = useCallback(
    (extra = {}) => ({
      scope,
      userId: scope === "user" ? userId : undefined,
      search,
      from,
      to,
      paymentStatus,
      mismatchesOnly,
      ...extra,
    }),
    [scope, userId, search, from, to, paymentStatus, mismatchesOnly],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("adminPaymentHistory", params({ limit: 100 }));
      setData(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Could not load the payment history.");
    } finally {
      setLoading(false);
    }
  }, [params]);

  // Debounced so typing in the search box doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const checkLive = async (row) => {
    setLiveBusy(row.booking_id);
    setError("");
    try {
      const res = await base44.functions.invoke("adminPaymentHistory", {
        scope: "booking",
        bookingId: row.booking_id,
      });
      setLiveData(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Could not reach Stripe for this booking.");
    } finally {
      setLiveBusy("");
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    setError("");
    try {
      const res = await base44.functions.invoke("adminPaymentHistory", params({ limit: 2000 }));
      const rows = (res.data?.rows || []).map((r) => ({
        ...r,
        at: r.at ? new Date(r.at).toLocaleString() : "",
        flags: (r.problems || []).join(" | "),
      }));
      if (rows.length === 0) {
        setError("There is nothing to export for this filter.");
        return;
      }
      downloadCsv(
        `blockwork-payments-${new Date().toISOString().slice(0, 10)}.csv`,
        toCsv(CSV_COLUMNS, rows),
      );
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "The export failed.");
    } finally {
      setExporting(false);
    }
  };

  const openUser = (id, label) => {
    if (!id) return;
    setScope("user");
    setUserId(id);
    setUserLabel(label || "this person");
  };

  const rows = data?.rows || [];
  const totals = data?.totals;

  return (
    <div className="space-y-3">
      {scope === "user" && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => { setScope("ledger"); setUserId(""); setUserLabel(""); }}>
            <ArrowLeft className="w-4 h-4" /> All payments
          </Button>
          <p className="text-sm text-muted-foreground">
            Payment history for <span className="font-semibold text-foreground">{userLabel}</span>
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        {scope === "ledger" && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="rounded-xl pl-9"
              placeholder="Search by job, neighbor, teen, or Stripe ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            className="rounded-xl w-[150px]"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="From date"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            className="rounded-xl w-[150px]"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            aria-label="To date"
          />
          <select
            className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            aria-label="Payment status"
          >
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>{s === "all" ? "All payment states" : s.replace(/_/g, " ")}</option>
            ))}
          </select>
          <button
            onClick={() => setMismatchesOnly((v) => !v)}
            className={`px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              mismatchesOnly ? "bg-destructive text-destructive-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Flagged only
          </button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={exporting}>
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Export CSV
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/20 rounded-2xl p-3">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Real totals for the current filter, computed by the database */}
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Total label="Charged" value={money(totals.charge)} />
          <Total label="Refunded" value={money(totals.refunded)} />
          <Total label="Net release to teens" value={money(totals.net)} />
          <Total label="Tips" value={money(totals.tips)} />
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-muted-foreground">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Date</th>
                <th className="text-left font-semibold px-4 py-3">Job</th>
                <th className="text-left font-semibold px-4 py-3 hidden sm:table-cell">Parties</th>
                <th className="text-right font-semibold px-4 py-3">Charged</th>
                <th className="text-right font-semibold px-4 py-3 hidden md:table-cell">Refunded</th>
                <th className="text-right font-semibold px-4 py-3 hidden lg:table-cell">Net</th>
                <th className="text-center font-semibold px-4 py-3">Payment</th>
                <th className="text-center font-semibold px-4 py-3">Stripe</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-border hover:bg-secondary/30 cursor-pointer"
                  onClick={() => checkLive(r)}
                >
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {r.at ? new Date(r.at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground truncate max-w-[180px]">{r.title || "—"}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-xs">
                    <button
                      className="block text-left truncate max-w-[140px] hover:text-primary hover:underline"
                      onClick={(e) => { e.stopPropagation(); openUser(r.buyer_user_id, r.buyer_name); }}
                    >
                      {r.buyer_name || "—"}
                    </button>
                    <button
                      className="block text-left truncate max-w-[140px] text-muted-foreground hover:text-primary hover:underline"
                      onClick={(e) => { e.stopPropagation(); openUser(r.teen_user_id, r.teen_name); }}
                    >
                      {r.teen_name || "—"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{money(r.charge_amount)}</td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    {r.admin_refund_amount > 0 ? money(r.admin_refund_amount) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell">{r.net_amount > 0 ? money(r.net_amount) : "—"}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={r.payment_status} /></td>
                  <td className="px-4 py-3 text-center">
                    {r.problems?.length > 0
                      ? <AlertTriangle className="w-4 h-4 text-destructive mx-auto" />
                      : <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />}
                    {liveBusy === r.booking_id && (
                      <Loader2 className="w-3 h-3 animate-spin text-muted-foreground mx-auto mt-1" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && rows.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Loading payment history…</p>
        )}
        {!loading && rows.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            {mismatchesOnly ? "No flagged payments for this filter." : "No payments match this filter."}
          </p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {rows.length} of {data?.count ?? 0} payment{data?.count === 1 ? "" : "s"}
        {data?.flagged > 0 ? ` · ${data.flagged} need${data.flagged === 1 ? "s" : ""} a closer look` : ""}
        {" · click a row to check it against Stripe"}
      </p>

      <AdminPaymentLiveCheck data={liveData} onClose={() => setLiveData(null)} />
    </div>
  );
}

function Total({ label, value }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-3.5 shadow-soft">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-foreground mt-0.5">{value}</p>
    </div>
  );
}