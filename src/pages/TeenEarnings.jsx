import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { format, subDays, subWeeks, subMonths, isAfter } from "date-fns";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { Download, Wallet } from "lucide-react";
import ErrorRetry from "@/components/grind/ErrorRetry";

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
  transferred: { label: "Sent to parent's bank", color: "#00D47E" },
  pending_review: { label: "In review", color: "#F2B84B" },
  awaiting_bank: { label: "Parent connecting bank", color: "#F2B84B" },
  not_started: { label: "Released to parent", color: "#00D47E" },
};

function FontLoader() {
  useEffect(() => {
    const id = "earnings-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);
  return null;
}

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

function Shell({ children, style }) {
  return (
    <>
      <FontLoader />
      <style>{`.earnings-page *{font-family:'Inter',system-ui,sans-serif}.earnings-page .serif{font-family:'Instrument Serif',Georgia,serif}`}</style>
      <div
        className="earnings-page -mx-4 lg:-mx-8 -mt-5 lg:-mt-8 px-4 lg:px-8 pt-5 lg:pt-8 pb-12"
        style={{ background: "#000", color: "#fff", minHeight: "80vh", ...style }}
      >
        {children}
      </div>
    </>
  );
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
      <Shell>
        <div className="flex justify-center items-center" style={{ minHeight: "60vh" }}>
          <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.08)", borderTopColor: "#2D9CDB" }} />
        </div>
      </Shell>
    );
  if (error)
    return (
      <Shell>
        <button onClick={load} className="flex flex-col items-center gap-3 py-20 w-full">
          <p className="text-sm font-medium" style={{ color: "#FF6B6B" }}>Couldn't load — tap to retry</p>
        </button>
      </Shell>
    );

  const totalEarned = records.reduce((s, r) => s + (r.net_amount || 0), 0);
  const pending = held.reduce((s, b) => s + (b.net_amount || b.price_total || 0), 0);
  const paidOut = cashouts.reduce((s, c) => s + (c.amount || 0), 0);
  const weekEarnings = records
    .filter((r) => r.occurred_at && isAfter(new Date(r.occurred_at), subDays(new Date(), 7)))
    .reduce((s, r) => s + (r.net_amount || 0), 0);

  const chartData = buildChartData(records, range);
  const hasData = records.length > 0 || held.length > 0;
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
    a.download = "kickstart-earnings.csv";
    a.click();
  };

  if (!hasData)
    return (
      <Shell>
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ background: "#0D0D0F", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Wallet style={{ color: "#8A8F98" }} className="w-7 h-7" />
            </div>
            <h2 className="serif" style={{ color: "#fff", fontSize: 28 }}>No earnings yet</h2>
            <p style={{ color: "#8A8F98" }} className="text-sm mt-2 mb-6">Complete your first job and your earnings will show up here.</p>
            <button onClick={() => navigate("/jobs")} style={{ background: "#2D9CDB", color: "#fff" }} className="px-6 py-3 rounded-full text-sm font-medium hover:opacity-90 transition-opacity">
              Browse jobs
            </button>
          </div>
        </div>
      </Shell>
    );

  return (
    <Shell>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="serif" style={{ color: "#fff", fontSize: 30 }}>Earnings</h1>
        {records.length > 0 && (
          <button onClick={exportCsv} style={{ color: "#8A8F98", border: "1px solid rgba(255,255,255,0.08)" }} className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium hover:bg-white/[0.03] transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        )}
      </div>

      {/* Hero balance */}
      <div className="mb-5">
        <p style={{ color: "#8A8F98" }} className="text-sm">Total balance</p>
        <p className="serif" style={{ color: "#fff", fontSize: "clamp(40px, 9vw, 60px)", lineHeight: 1.05, marginTop: 2 }}>
          {fmt(totalEarned)}
        </p>
        <p style={{ color: weekEarnings >= 0 ? "#00D47E" : "#FF4D4D" }} className="text-sm mt-1.5 font-medium">
          {fmtChange(weekEarnings)} this week
        </p>
      </div>

      {/* Cash Out */}
      <button
        onClick={() => navigate("/teen/wallet")}
        style={{ background: "#2D9CDB", color: "#fff" }}
        className="w-full py-3.5 rounded-full font-medium text-sm mb-6 hover:opacity-90 transition-opacity"
      >
        Cash Out
      </button>

      {/* Chart */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: "#0D0D0F", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex gap-2 mb-4">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                background: range === r ? "#2D9CDB" : "transparent",
                color: range === r ? "#fff" : "#8A8F98",
                border: `1px solid ${range === r ? "#2D9CDB" : "rgba(255,255,255,0.08)"}`,
              }}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
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
                  <stop offset="0%" stopColor="#2D9CDB" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#2D9CDB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis domain={[0, "auto"]} hide />
              <XAxis
                dataKey="label"
                tick={{ fill: "#8A8F98", fontSize: 11, fontFamily: "'Inter', sans-serif" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <Tooltip
                contentStyle={{ background: "#0D0D0F", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: 12 }}
                labelStyle={{ color: "#8A8F98" }}
                formatter={(v) => [fmt(v), "Earned"]}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#2D9CDB"
                strokeWidth={2}
                fill="url(#earningsGrad)"
                dot={false}
                activeDot={{ fill: "#2D9CDB", r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2.5 mb-6">
        {[
          { label: "Total Earned", value: totalEarned, color: "#fff" },
          { label: "Pending", value: pending, color: "#F2B84B" },
          { label: "Paid Out", value: paidOut, color: "#00D47E" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-3.5" style={{ background: "#0D0D0F", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p style={{ color: "#8A8F98" }} className="text-[11px] font-medium">{s.label}</p>
            <p className="serif" style={{ color: s.color, fontSize: 20, marginTop: 4 }}>{fmt(s.value)}</p>
          </div>
        ))}
      </div>

      {/* Transactions */}
      <div>
        <h2 style={{ color: "#fff" }} className="text-sm font-semibold mb-3">Transactions</h2>
        <div className="space-y-2">
          {transactions.map((t) => {
            const payoutStatus = t.status === "paid" && t.bookingId ? payoutByBooking[t.bookingId] : null;
            const st = payoutStatus ? (PAYOUT_STATUS[payoutStatus] || STATUS.paid) : STATUS[t.status];
            const prefix = t.status === "paid" ? "+" : t.status === "refunded" ? "\u2212" : "";
            return (
              <div
                key={t.id}
                onClick={() => t.bookingId && navigate(`/bookings/${t.bookingId}`)}
                className="flex items-center justify-between rounded-xl p-3.5 cursor-pointer transition-colors hover:bg-white/[0.02]"
                style={{ background: "#0D0D0F", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="min-w-0">
                  <p style={{ color: "#fff" }} className="text-sm font-medium truncate">{t.title}</p>
                  <p style={{ color: "#8A8F98" }} className="text-xs mt-0.5">{t.date}</p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0 ml-3">
                  <span style={{ color: st.color, background: `${st.color}26` }} className="text-[10px] font-medium px-2 py-0.5 rounded-full">
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
    </Shell>
  );
}