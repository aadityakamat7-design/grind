import React, { useState, useMemo } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
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

function ChartCard({ title, data, valueKey, dateKey, color, moneyFormat }) {
  const [range, setRange] = useState("1M");
  const chartData = useMemo(() => buildChartData(data, range, valueKey, dateKey), [data, range, valueKey, dateKey]);
  const fmt = (n) => moneyFormat ? `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : Number(n || 0).toLocaleString();

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-bold text-foreground">{title}</h3>
        <div className="flex gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                range === r ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${title.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis domain={[0, "auto"]} hide />
            <XAxis dataKey="label" tick={{ fill: "hsl(210 19% 45%)", fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <Tooltip
              contentStyle={{ background: "hsl(214 60% 98%)", border: "1px solid hsl(213 56% 93%)", borderRadius: 12, color: "hsl(213 66% 17%)", fontSize: 12 }}
              formatter={(v) => [fmt(v), moneyFormat ? "Value" : "Count"]}
            />
            <Area type="monotone" dataKey="amount" stroke={color} strokeWidth={2} fill={`url(#grad-${title.replace(/\s/g, "")})`} dot={false} activeDot={{ fill: color, r: 4, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function AdminCharts({ bookings }) {
  const gmvData = bookings.filter((b) => !["cancelled", "denied"].includes(b.status));
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <ChartCard title="Bookings over time" data={bookings} valueKey="price_total" dateKey="created_date" color="#2E6BE0" moneyFormat={false} />
      <ChartCard title="GMV over time" data={gmvData} valueKey="price_total" dateKey="created_date" color="#00A878" moneyFormat={true} />
    </div>
  );
}