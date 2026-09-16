import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext, Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Wallet, Bot, Lock, Download } from "lucide-react";
import { format, subDays, subWeeks, subMonths, isAfter } from "date-fns";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { getOrCreateWallet } from "@/lib/wallet";
import { money, PLATFORM_FEE_RATE, PLATFORM_FEE_FIXED } from "@/lib/grind";
import CashOutDialog from "@/components/grind/wallet/CashOutDialog";
import PageHeader from "@/components/grind/PageHeader";
import ErrorRetry from "@/components/grind/ErrorRetry";
import PullToRefresh from "@/components/PullToRefresh";

const fmt = (n) => `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const round2 = (n) => Math.round(n * 100) / 100;

const RANGES = ["1W", "1M", "3M", "1Y", "ALL"];
const STATUS = {
  paid: { label: "Paid", color: "#00D47E" },
  pending: { label: "Pending", color: "#F2B84B" },
};
const PAYOUT_STATUS = {
  pending_release: { label: "Held until the job is complete", color: "#F2B84B" },
  blocked_no_destination: { label: "Waiting for bank setup", color: "#FF4D4D" },
  awaiting_active_account: { label: "Waiting for bank setup to finish", color: "#F2B84B" },
  awaiting_new_account_hold: { label: "New account hold — 72 hours", color: "#F2B84B" },
  pending_review: { label: "Under review — usually clears within 24 hours", color: "#F2B84B" },
  duplicate_blocked: { label: "Already sent", color: "#00D47E" },
  transferred: { label: "Sent — arrives in 1–2 business days", color: "#00D47E" },
  paid_out: { label: "In your bank", color: "#00D47E" },
  // Legacy
  awaiting_settlement: { label: "Held until the job is complete", color: "#F2B84B" },
  awaiting_bank: { label: "Waiting for bank setup to finish", color: "#F2B84B" },
  pending_new_account_hold: { label: "New account hold — 72 hours", color: "#F2B84B" },
  not_started: { label: "Released", color: "#00D47E" },
};

function buildChartData(records, range) {
  const now = new Date();
  const points = [];
  const sumInRange = (start, end) =>
    records
      .filter((r) => r.occurred_at && new Date(r.occurred_at) >= start && new Date(r.occurred_at) < end)
      .reduce((s, r) => s + (r.net_amount || 0), 0);

  if (range === "1W") {
    for (let i = 6; i >= 0; i--) {
      const d = subDays(now, i);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      points.push({ label: format(d, "EEE"), amount: round2(sumInRange(start, new Date(start.getTime() + 86400000))) });
    }
  } else if (range === "1M") {
    for (let i = 29; i >= 0; i--) {
      const d = subDays(now, i);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      points.push({ label: i % 7 === 0 ? format(d, "MMM d") : "", amount: round2(sumInRange(start, new Date(start.getTime() + 86400000))) });
    }
  } else if (range === "3M") {
    for (let i = 11; i >= 0; i--) {
      const start = subWeeks(now, i);
      const end = subWeeks(now, i - 1);
      points.push({ label: format(start, "MMM d"), amount: round2(sumInRange(start, end)) });
    }
  } else if (range === "1Y") {
    for (let i = 11; i >= 0; i--) {
      const m = subMonths(now, i);
      const start = new Date(m.getFullYear(), m.getMonth(), 1);
      const end = new Date(m.getFullYear(), m.getMonth() + 1, 1);
      points.push({ label: format(start, "MMM"), amount: round2(sumInRange(start, end)) });
    }
  } else {
    const grouped = {};
    records.forEach((r) => {
      if (!r.occurred_at) return;
      const k = format(new Date(r.occurred_at), "MMM yy");
      grouped[k] = (grouped[k] || 0) + (r.net_amount || 0);
    });
    return Object.entries(grouped).map(([label, amount]) => ({ label, amount: round2(amount) }));
  }
  return points;
}

export default function TeenWallet() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [records, setRecords] = useState([]);
  const [held, setHeld] = useState([]);
  const [releasedBookings, setReleasedBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [cashOutOpen, setCashOutOpen] = useState(false);
  const [withdrawalsLocked, setWithdrawalsLocked] = useState(false);
  const [range, setRange] = useState("1M");

  const load = useCallback(async () => {
    try {
      setError(false);
      const [w, r, h, rb, links] = await Promise.all([
        getOrCreateWallet(user.id),
        base44.entities.EarningsRecord.filter({ teen_user_id: user.id }, "-occurred_at", 200),
        base44.entities.Booking.filter({ teen_user_id: user.id, payment_status: "held" }),
        base44.entities.Booking.filter({ teen_user_id: user.id, payment_status: "released" }),
        base44.entities.ParentTeenLink.filter({ teen_user_id: user.id, status: "confirmed" }),
      ]);
      setWallet(w);
      setRecords(r);
      setHeld(h);
      setReleasedBookings(rb);
      setWithdrawalsLocked(!!links[0]?.withdrawals_locked);
    } catch (err) {
      console.error("TeenWallet load failed:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsubEarn = base44.entities.EarningsRecord.subscribe(() => load());
    const unsubBook = base44.entities.Booking.subscribe(() => load());
    return () => { unsubEarn(); unsubBook(); };
  }, [load]);

  if (loading)
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-lg bg-muted skeleton-shimmer" />
        <div className="bg-card rounded-2xl border border-border h-32 skeleton-shimmer" />
        <div className="bg-card rounded-2xl border border-border h-48 skeleton-shimmer" />
      </div>
    );
  if (error) return <ErrorRetry onRetry={load} />;

  const totalEarned = records.reduce((s, r) => s + (r.net_amount || 0), 0);
  const pending = held.reduce((s, b) => {
    // Use the actual net_amount if already computed (released bookings), otherwise
    // estimate the expected net from the gross price_total using the known fee rate.
    // Never fall back to the raw gross — teens only see net.
    if (b.net_amount) return s + b.net_amount;
    const gross = Number(b.price_total) || 0;
    if (gross <= 0) return s;
    const estNet = Math.max(0, Math.round((gross - gross * PLATFORM_FEE_RATE - PLATFORM_FEE_FIXED) * 100) / 100);
    return s + estNet;
  }, 0);
  const weekEarnings = records
    .filter((r) => r.occurred_at && isAfter(new Date(r.occurred_at), subDays(new Date(), 7)))
    .reduce((s, r) => s + (r.net_amount || 0), 0);

  const chartData = buildChartData(records, range);
  const payoutByBooking = Object.fromEntries(releasedBookings.map((b) => [b.id, b.payout_status]));

  const transactions = [
    ...records.map((r) => ({
      id: r.id, title: r.listing_title || "Job",
      date: r.occurred_at ? format(new Date(r.occurred_at), "MMM d, yyyy") : "",
      rawDate: r.occurred_at ? new Date(r.occurred_at).getTime() : 0,
      amount: r.net_amount || 0, status: "paid", bookingId: r.booking_id,
    })),
    ...held.map((b) => ({
      id: b.id, title: b.listing_title || "Job",
      date: b.scheduled_start ? format(new Date(b.scheduled_start), "MMM d, yyyy") : "Pending",
      rawDate: b.scheduled_start ? new Date(b.scheduled_start).getTime() : Date.now(),
      amount: b.net_amount || 0, status: "pending", bookingId: b.id,
    })),
  ].sort((a, b) => b.rawDate - a.rawDate);

  const exportCsv = () => {
    const rows = [
      ["Date", "Job", "Neighbor", "Net", "Status"],
      ...records.map((r) => [
        r.occurred_at ? format(new Date(r.occurred_at), "yyyy-MM-dd") : "",
        r.listing_title || "", r.buyer_name || "", r.net_amount, "paid",
      ]),
    ];
    const csv = rows.map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "blockwork-earnings.csv";
    a.click();
  };

  return (
    <PullToRefresh onRefresh={load}>
      <div className="space-y-6">
        <PageHeader title="Wallet">
          {records.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
          )}
        </PageHeader>

        {/* Balance card */}
        <div className="bg-gradient-to-br from-foreground to-primary rounded-2xl p-6 text-primary-foreground shadow-card">
          <p className="text-[13px] opacity-80 flex items-center gap-1.5"><Wallet className="w-4 h-4" /> Available to cash out</p>
          <p className="text-[40px] font-extrabold mt-1.5 tracking-tight">{money(wallet.balance || 0)}</p>
          <p className="text-[12px] opacity-70 mt-2">
            +{fmt(weekEarnings)} earned this week
          </p>
        </div>

        {withdrawalsLocked && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-700">Withdrawals paused</p>
              <p className="text-xs text-amber-600 mt-1">
                Your parent has paused cash-outs. Ask them to re-enable from their dashboard.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button
            className="rounded-full h-12"
            disabled={(wallet.balance || 0) <= 0 || withdrawalsLocked}
            onClick={() => setCashOutOpen(true)}
          >
            <ArrowUpRight className="w-4 h-4 mr-1.5" /> Cash out
          </Button>
          <Link to="/withdrawal-assistant">
            <Button variant="outline" className="rounded-full w-full h-12">
              <Bot className="w-4 h-4 mr-1.5" /> Withdrawal Assistant
            </Button>
          </Link>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: "Total earned", value: totalEarned, color: "text-foreground" },
            { label: "Pending", value: pending, color: "text-warning" },
            { label: "Available", value: wallet.balance || 0, color: "text-success" },
          ].map((s) => (
            <div key={s.label} className="bg-card rounded-2xl border border-border p-3.5">
              <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
              <p className={`font-display text-xl font-bold mt-1 ${s.color}`}>{fmt(s.value)}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  range === r
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground border border-border hover:bg-secondary"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <div style={{ height: 180 }} className="sm:h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                <defs>
                  <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis domain={[0, "auto"]} hide />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 14 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, color: "hsl(var(--foreground))", fontSize: 14 }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  formatter={(v) => [fmt(v), "Earned"]}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#earningsGrad)"
                  dot={false}
                  activeDot={{ fill: "hsl(var(--primary))", r: 4, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Transactions */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Transactions</h2>
          <div className="space-y-2">
            {transactions.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">No transactions yet.</p>
            )}
            {transactions.map((t) => {
              const payoutStatus = t.status === "paid" && t.bookingId ? payoutByBooking[t.bookingId] : null;
              const st = payoutStatus ? (PAYOUT_STATUS[payoutStatus] || STATUS.paid) : STATUS[t.status];
              const prefix = t.status === "paid" ? "+" : "";
              return (
                <div
                  key={t.id}
                  onClick={() => t.bookingId && navigate(`/bookings/${t.bookingId}`)}
                  className="flex items-center justify-between rounded-xl p-3.5 cursor-pointer transition-colors hover:bg-secondary bg-card border border-border"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.date}</p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0 ml-3">
                    <span
                      className="text-sm font-medium px-2 py-0.5 rounded-full"
                      style={{ color: st.color, background: `${st.color}1a` }}
                    >
                      {st.label}
                    </span>
                    <span style={{ color: st.color }} className="text-sm font-semibold tabular-nums">
                      {prefix}{fmt(t.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-4 mt-2 border-t border-border">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <Link to="/terms" className="font-medium hover:text-foreground transition-colors">Terms</Link>
            <Link to="/privacy" className="font-medium hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>

        {cashOutOpen && (
          <CashOutDialog open={cashOutOpen} onOpenChange={setCashOutOpen} wallet={wallet} onDone={load} />
        )}
      </div>
    </PullToRefresh>
  );
}