import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { format, subDays, subWeeks, subMonths, isAfter } from "date-fns";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { Download, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/grind/PageHeader";
import { money } from "@/lib/grind";

const fmt = (n) => `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtChange = (n) => `${n >= 0 ? "+" : "\u2212"}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const round2 = (n) => Math.round(n * 100) / 100;

const RANGES = ["1W", "1M", "3M", "1Y", "ALL"];
const STATUS = {
  paid: { label: "Paid", color: "#00D47E" },
  pending: { label: "Pending", color: "#F2B84B" },
  refunded: { label: "Refunded", color: "#FF4D4D" },
};

const PAYOUT_STATUS = {
  awaiting_settlement: { label: "Settling (~7 days)", color: "#F2B84B" },
  transferred: { label: "Sent to parent's bank", color: "#00D47E" },
  pending_review: { label: "In review", color: "#F2B84B" },
  awaiting_bank: { label: "Parent connecting bank", color: "#F2B84B" },
  pending_new_account_hold: { label: "New account hold (72h)", color: "#F2B84B" },
  not_started: { label: "Released to parent", color: "#00D47E" },
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

export default function TeenEarnings() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [held, setHeld] = useState([]);
  const [cashouts, setCashouts] = useState([]);
  const [releasedBookings, setReleasedBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [range, setRange] = useState("1M");

  const load = useCallback(async () => {
    try {
      setError(false);
      const [r, h, c, rb] = await Promise.all([
        base44.entities.EarningsRecord.filter({ teen_user_id: user.id }, "-occurred_at"),
        base44.entities.Booking.filter({ teen_user_id: user.id, payment_status: "held" }),
        base44.entities.WalletTransaction.filter({ teen_user_id: user.id, type: "cashout" }, "-occurred_at"),
        base44.entities.Booking.filter({ teen_user_id: user.id, payment_status: "released" }),
      ]);
      setRecords(r);
      setHeld(h);
      setCashouts(c);
      setReleasedBookings(rb);
    } catch (err) {
      console.error("TeenEarnings load failed:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  // Real-time: reload when earnings or bookings change
  useEffect(() => {
    const unsubEarn = base44.entities.EarningsRecord.subscribe(() => load());
    const unsubBook = base44.entities.Booking.subscribe(() => load());
    return () => { unsubEarn(); unsubBook(); };
  }, [load]);

  if (loading)
    return (
      <div className="space-y-6">
        <PageHeader title="Earnings" />
        <div className="h-8 w-48 rounded-lg bg-muted skeleton-shimmer" />
        <div className="bg-card rounded-2xl border border-border h-32 skeleton-shimmer" />
      </div>
    );
  if (error)
    return (
      <div className="space-y-6">
        <PageHeader title="Earnings" />
        <button onClick={load} className="text-sm font-medium text-destructive">Couldn't load — tap to retry</button>
      </div>
    );

  const totalEarned = records.reduce((s, r) => s + (r.net_amount || 0), 0);
  const pending = held.reduce((s, b) => s + (b.net_amount || b.price_total || 0), 0);
  const paidOut = cashouts.reduce((s, c) => s + (c.amount || 0), 0);
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
      ["Date", "Job", "Neighbor", "Gross", "Net"],
      ...records.map((r) => [
        r.occurred_at ? format(new Date(r.occurred_at), "yyyy-MM-dd") : "",
        r.listing_title || "", r.buyer_name || "", r.amount, r.net_amount,
      ]),
    ];
    const csv = rows.map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "blockwork-earnings.csv";
    a.click();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Earnings">
        {records.length > 0 && (
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        )}
      </PageHeader>

      {/* Hero balance */}
      <div>
        <p className="text-sm text-muted-foreground">Total balance</p>
        <p className="font-display text-4xl lg:text-5xl font-bold text-foreground mt-1">
          {fmt(totalEarned)}
        </p>
        <p className={`text-sm mt-1.5 font-medium ${weekEarnings >= 0 ? "text-success" : "text-destructive"}`}>
          {fmtChange(weekEarnings)} this week
        </p>
      </div>

      {/* Cash Out */}
      <Button className="w-full" onClick={() => navigate("/teen/wallet")}>
        <Wallet className="w-4 h-4 mr-1.5" /> Cash Out
      </Button>

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
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, color: "hsl(var(--foreground))", fontSize: 12 }}
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

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { label: "Total Earned", value: totalEarned, color: "text-foreground" },
          { label: "Pending", value: pending, color: "text-warning" },
          { label: "Paid Out", value: paidOut, color: "text-success" },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-2xl border border-border p-3.5">
            <p className="text-[11px] font-medium text-muted-foreground">{s.label}</p>
            <p className={`font-display text-xl font-bold mt-1 ${s.color}`}>{fmt(s.value)}</p>
          </div>
        ))}
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
            const prefix = t.status === "paid" ? "+" : t.status === "refunded" ? "\u2212" : "";
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
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full"
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
    </div>
  );
}