import React, { useState, useMemo } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Cell } from "recharts";
import { format, subDays, subWeeks, subMonths } from "date-fns";

const RANGES = ["1W", "1M", "3M", "1Y", "ALL"];
const round2 = (n) => Math.round(n * 100) / 100;

function buildChartData(records, range, valueKey, dateKey) {
  const now = new Date();
  const points = [];
  const sumInRange = (start, end) =>
    records
      .filter((r) => r[dateKey] && new Date(r[dateKey]) >= start && new Date(r[dateKey]) < end)
      .reduce((s, r) => s + (Number(r[valueKey]) || 0), 0);

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
      if (!r[dateKey]) return;
      const k = format(new Date(r[dateKey]), "MMM yy");
      grouped[k] = (grouped[k] || 0) + (Number(r[valueKey]) || 0);
    });
    return Object.entries(grouped).map(([label, amount]) => ({ label, amount: round2(amount) }));
  }
  return points;
}

export function EarningsAreaChart({ data, valueKey = "net_amount", dateKey = "occurred_at", color = "#2E6BE0", height = 180, moneyFormat = true }) {
  const [range, setRange] = useState("1M");
  const chartData = useMemo(() => buildChartData(data, range, valueKey, dateKey), [data, range, valueKey, dateKey]);

  const fmt = (n) => moneyFormat ? `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : Number(n || 0).toLocaleString();

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-4">
      <div className="flex gap-2 mb-3">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              range === r ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <div style={{ height }} className="sm:h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis domain={[0, "auto"]} hide />
            <XAxis dataKey="label" tick={{ fill: "hsl(210 19% 45%)", fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <Tooltip
              contentStyle={{ background: "hsl(214 60% 98%)", border: "1px solid hsl(213 56% 93%)", borderRadius: 12, color: "hsl(213 66% 17%)", fontSize: 12 }}
              formatter={(v) => [fmt(v), "Amount"]}
            />
            <Area type="monotone" dataKey="amount" stroke={color} strokeWidth={2} fill="url(#areaGrad)" dot={false} activeDot={{ fill: color, r: 4, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CategoryBarChart({ data, height = 200 }) {
  // data: [{ label, value, color? }]
  const colors = ["#2E6BE0", "#00A878", "#F2B84B", "#FF6B6B", "#9B6BFF", "#00B8D9"];
  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-4">
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="label" tick={{ fill: "hsl(210 19% 45%)", fontSize: 12 }} axisLine={false} tickLine={false} width={100} />
            <Tooltip
              contentStyle={{ background: "hsl(214 60% 98%)", border: "1px solid hsl(213 56% 93%)", borderRadius: 12, color: "hsl(213 66% 17%)", fontSize: 12 }}
              formatter={(v) => [`$${Number(v || 0).toFixed(2)}`, "Earned"]}
              cursor={{ fill: "hsl(213 56% 95%)" }}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22}>
              {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}