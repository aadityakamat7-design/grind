import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, ComposedChart,
} from "recharts";
import { format, subDays, subWeeks, subMonths, isAfter, isBefore } from "date-fns";
import { TrendingUp, TrendingDown, Users, CalendarDays, Wallet, CheckCircle2, Trophy, MapPin, CreditCard } from "lucide-react";
import { money } from "@/lib/grind";

const RANGES = ["1W", "1M", "3M", "1Y", "ALL"];
const CATEGORY_LABELS = {
  tutoring: "Tutoring", tech_help: "Tech Help", lawn_care: "Lawn Care",
  car_washing: "Car Washing", odd_jobs: "Odd Jobs", pet_sitting: "Pet Sitting",
};
const CATEGORY_COLORS = {
  tutoring: "#2E6BE0", tech_help: "#9333EA", lawn_care: "#00A878",
  car_washing: "#38BDF8", odd_jobs: "#F59E0B", pet_sitting: "#EC4899",
};
const PAYMENT_COLORS = { unpaid: "#94A3B8", held: "#F59E0B", releasing: "#3B82F6", released: "#00A878", refunded: "#EF4444" };
const round2 = (n) => Math.round(n * 100) / 100;

function rangeStart(range, now) {
  if (range === "1W") return subDays(now, 7);
  if (range === "1M") return subDays(now, 30);
  if (range === "3M") return subDays(now, 90);
  if (range === "1Y") return subDays(now, 365);
  return new Date(0);
}

function prevStart(range, currentStart, now) {
  const span = now.getTime() - currentStart.getTime();
  return new Date(currentStart.getTime() - span);
}

function buildTimeSeries(records, range, dateKey) {
  const now = new Date();
  const start = rangeStart(range, now);
  const inRange = records.filter((r) => r[dateKey] && isAfter(new Date(r[dateKey]), start));
  const points = [];

  if (range === "1W" || range === "1M") {
    const days = range === "1W" ? 7 : 30;
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(now, i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const dayRecords = inRange.filter((r) => {
        const rd = new Date(r[dateKey]);
        return isAfter(rd, dayStart) && isBefore(rd, dayEnd);
      });
      points.push({
        label: days <= 7 ? format(d, "EEE") : (i % 7 === 0 ? format(d, "MMM d") : ""),
        bookings: dayRecords.length,
        gmv: round2(dayRecords.reduce((s, r) => s + (Number(r.price_total) || 0), 0)),
        revenue: round2(dayRecords.reduce((s, r) => s + (Number(r.platform_fee) || 0), 0)),
      });
    }
  } else if (range === "3M") {
    for (let i = 11; i >= 0; i--) {
      const ws = subWeeks(now, i);
      const we = subWeeks(now, i - 1);
      const weekRecords = inRange.filter((r) => {
        const rd = new Date(r[dateKey]);
        return isAfter(rd, ws) && isBefore(rd, we);
      });
      points.push({
        label: format(ws, "MMM d"),
        bookings: weekRecords.length,
        gmv: round2(weekRecords.reduce((s, r) => s + (Number(r.price_total) || 0), 0)),
        revenue: round2(weekRecords.reduce((s, r) => s + (Number(r.platform_fee) || 0), 0)),
      });
    }
  } else {
    const months = range === "1Y" ? 12 : 24;
    for (let i = months - 1; i >= 0; i--) {
      const m = subMonths(now, i);
      const ms = new Date(m.getFullYear(), m.getMonth(), 1);
      const me = new Date(m.getFullYear(), m.getMonth() + 1, 1);
      const monthRecords = inRange.filter((r) => {
        const rd = new Date(r[dateKey]);
        return isAfter(rd, ms) && isBefore(rd, me);
      });
      points.push({
        label: format(ms, "MMM yy"),
        bookings: monthRecords.length,
        gmv: round2(monthRecords.reduce((s, r) => s + (Number(r.price_total) || 0), 0)),
        revenue: round2(monthRecords.reduce((s, r) => s + (Number(r.platform_fee) || 0), 0)),
      });
    }
  }
  return points;
}

function TrendBadge({ current, previous }) {
  if (previous === 0 && current === 0) return <span className="text-xs text-muted-foreground">—</span>;
  if (previous === 0) return (
    <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
      <TrendingUp className="w-3 h-3" /> New
    </span>
  );
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-semibold ${up ? "text-emerald-600" : "text-rose-500"}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(Math.round(pct))}%
    </span>
  );
}

function KPI({ icon: Icon, label, value, current, previous, accent }) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <Icon className={`w-4 h-4 ${accent}`} />
        </div>
        <TrendBadge current={current} previous={previous} />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function FunnelBar({ label, count, pct, color }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 text-xs text-muted-foreground text-right shrink-0">{label}</div>
      <div className="flex-1 h-7 bg-secondary rounded-lg overflow-hidden relative">
        <div className="h-full rounded-lg flex items-center justify-end px-2 transition-all" style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: color }}>
          <span className="text-xs font-bold text-white">{count}</span>
        </div>
      </div>
      <div className="w-10 text-xs text-muted-foreground shrink-0">{pct}%</div>
    </div>
  );
}

function LeaderboardRow({ rank, name, sub, value, valueLabel }) {
  const medal = rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `#${rank + 1}`;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <span className="text-sm font-bold w-7 text-center shrink-0">{medal}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate">{name}</p>
        <p className="text-xs text-muted-foreground truncate">{sub}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{valueLabel}</p>
      </div>
    </div>
  );
}

export default function AdminAnalytics({ bookings, teens, buyers, parents, listings }) {
  const [range, setRange] = useState("1M");

  const now = new Date();
  const start = rangeStart(range, now);
  const pStart = prevStart(range, start, now);

  const validBookings = useMemo(() => bookings.filter((b) => !["cancelled", "denied"].includes(b.status)), [bookings]);

  const inRange = validBookings.filter((b) => b.created_date && isAfter(new Date(b.created_date), start));
  const inPrev = validBookings.filter((b) => b.created_date && isAfter(new Date(b.created_date), pStart) && isBefore(new Date(b.created_date), start));

  const currentGMV = inRange.reduce((s, b) => s + (b.price_total || 0), 0);
  const prevGMV = inPrev.reduce((s, b) => s + (b.price_total || 0), 0);
  const currentRevenue = inRange.reduce((s, b) => s + (b.platform_fee || 0), 0);
  const prevRevenue = inPrev.reduce((s, b) => s + (b.platform_fee || 0), 0);
  const currentBookings = inRange.length;
  const prevBookings = inPrev.length;

  const allSignups = [
    ...teens.map((t) => ({ created_date: t.created_date })),
    ...buyers.map((b) => ({ created_date: b.created_date })),
    ...parents.map((p) => ({ created_date: p.created_date })),
  ];
  const currentSignups = allSignups.filter((s) => s.created_date && isAfter(new Date(s.created_date), start)).length;
  const prevSignups = allSignups.filter((s) => s.created_date && isAfter(new Date(s.created_date), pStart) && isBefore(new Date(s.created_date), start)).length;

  const timeSeries = useMemo(() => buildTimeSeries(validBookings, range, "created_date"), [validBookings, range]);

  const funnel = useMemo(() => {
    const total = bookings.length;
    const approved = bookings.filter((b) => !["cancelled", "denied"].includes(b.status)).length;
    const started = bookings.filter((b) => ["in_progress", "completed"].includes(b.status)).length;
    const completed = bookings.filter((b) => b.status === "completed").length;
    const max = total || 1;
    return [
      { label: "Created", count: total, pct: 100, color: "#94A3B8" },
      { label: "Approved", count: approved, pct: Math.round((approved / max) * 100), color: "#2E6BE0" },
      { label: "Started", count: started, pct: Math.round((started / max) * 100), color: "#F59E0B" },
      { label: "Completed", count: completed, pct: Math.round((completed / max) * 100), color: "#00A878" },
    ];
  }, [bookings]);

  const categoryData = useMemo(() => {
    const listingMap = {};
    listings.forEach((l) => { listingMap[l.id] = l.category; });
    const counts = {};
    validBookings.forEach((b) => {
      const cat = listingMap[b.listing_id] || "odd_jobs";
      if (!counts[cat]) counts[cat] = { category: cat, bookings: 0, gmv: 0 };
      counts[cat].bookings += 1;
      counts[cat].gmv += b.price_total || 0;
    });
    return Object.values(counts).sort((a, b) => b.bookings - a.bookings).map((c) => ({
      ...c, gmv: round2(c.gmv), label: CATEGORY_LABELS[c.category] || c.category, color: CATEGORY_COLORS[c.category] || "#94A3B8",
    }));
  }, [validBookings, listings]);

  const paymentData = useMemo(() => {
    const counts = {};
    bookings.forEach((b) => {
      const s = b.payment_status || "unpaid";
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value, color: PAYMENT_COLORS[name] || "#94A3B8" }));
  }, [bookings]);

  const topTeens = useMemo(() =>
    [...teens].sort((a, b) => (b.jobs_completed || 0) - (a.jobs_completed || 0)).slice(0, 5), [teens]);

  const topBuyers = useMemo(() => {
    const spend = {};
    validBookings.forEach((b) => {
      if (b.buyer_user_id) spend[b.buyer_user_id] = (spend[b.buyer_user_id] || 0) + (b.price_total || 0);
    });
    return buyers
      .map((b) => ({ ...b, totalSpend: spend[b.user_id] || 0 }))
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 5);
  }, [validBookings, buyers]);

  const geoData = useMemo(() => {
    const cities = {};
    teens.forEach((t) => {
      const c = t.resolved_city || t.state || "Unknown";
      cities[c] = (cities[c] || 0) + 1;
    });
    buyers.forEach((b) => {
      const c = b.resolved_city || b.state || "Unknown";
      cities[c] = (cities[c] || 0) + 1;
    });
    return Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [teens, buyers]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-[17px] font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" /> Analytics
        </h2>
        <div className="flex gap-1.5">
          {RANGES.map((r) => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                range === r ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI icon={CalendarDays} label="Bookings" value={currentBookings} current={currentBookings} previous={prevBookings} accent="text-primary" />
        <KPI icon={Wallet} label="GMV" value={money(currentGMV)} current={currentGMV} previous={prevGMV} accent="text-emerald-600" />
        <KPI icon={TrendingUp} label="Platform revenue" value={money(currentRevenue)} current={currentRevenue} previous={prevRevenue} accent="text-amber-600" />
        <KPI icon={Users} label="New signups" value={currentSignups} current={currentSignups} previous={prevSignups} accent="text-violet-600" />
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-soft p-4">
        <h3 className="text-[14px] font-bold text-foreground mb-3">Bookings & GMV trend</h3>
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={timeSeries} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00A878" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#00A878" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 20% 90%)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "hsl(210 19% 45%)", fontSize: 12 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis yAxisId="left" tick={{ fill: "hsl(210 19% 45%)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: "hsl(210 19% 45%)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "hsl(214 60% 98%)", border: "1px solid hsl(213 56% 93%)", borderRadius: 12, fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area yAxisId="left" type="monotone" dataKey="gmv" name="GMV" stroke="#00A878" strokeWidth={2} fill="url(#gmvGrad)" dot={false} />
              <Bar yAxisId="right" dataKey="bookings" name="Bookings" fill="#2E6BE0" radius={[4, 4, 0, 0]} barSize={12} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border shadow-soft p-4">
          <h3 className="text-[14px] font-bold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" /> Booking funnel
          </h3>
          <div className="space-y-3">
            {funnel.map((f) => <FunnelBar key={f.label} label={f.label} count={f.count} pct={f.pct} color={f.color} />)}
          </div>
          <div className="mt-4 pt-3 border-t border-border space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Overall completion rate</span>
              <span className="font-bold text-foreground">
                {bookings.length > 0 ? Math.round((funnel[3].count / bookings.length) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Approval rate</span>
              <span className="font-bold text-foreground">
                {bookings.length > 0 ? Math.round((funnel[1].count / bookings.length) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-soft p-4">
          <h3 className="text-[14px] font-bold text-foreground mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" /> Payment status
          </h3>
          {paymentData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No payments yet.</p>
          ) : (
            <div className="flex items-center gap-4">
              <div style={{ width: 140, height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={2}>
                      {paymentData.map((e) => <Cell key={e.name} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(214 60% 98%)", border: "1px solid hsl(213 56% 93%)", borderRadius: 12, fontSize: 13 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                {paymentData.map((e) => (
                  <div key={e.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                      <span className="text-muted-foreground capitalize">{e.name}</span>
                    </span>
                    <span className="font-bold text-foreground">{e.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-soft p-4">
        <h3 className="text-[14px] font-bold text-foreground mb-3">Category performance</h3>
        {categoryData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No bookings yet.</p>
        ) : (
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 20% 90%)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "hsl(210 19% 45%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(210 19% 45%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(214 60% 98%)", border: "1px solid hsl(213 56% 93%)", borderRadius: 12, fontSize: 13 }}
                  formatter={(v, name) => [name === "gmv" ? money(v) : v, name === "gmv" ? "GMV" : "Bookings"]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="bookings" name="Bookings" radius={[4, 4, 0, 0]} barSize={28}>
                  {categoryData.map((e) => <Cell key={e.category} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border shadow-soft p-4">
          <h3 className="text-[14px] font-bold text-foreground mb-2 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" /> Top teens
          </h3>
          {topTeens.length === 0 || !topTeens[0]?.jobs_completed ? (
            <p className="text-sm text-muted-foreground text-center py-6">No completed jobs yet.</p>
          ) : (
            topTeens.map((t, i) => (
              <LeaderboardRow key={t.id} rank={i} name={t.display_name}
                sub={`${t.resolved_city || t.state || "—"} · ${t.avg_rating ? `${t.avg_rating.toFixed(1)}★` : "no rating"}`}
                value={t.jobs_completed || 0} valueLabel="jobs" />
            ))
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-soft p-4">
          <h3 className="text-[14px] font-bold text-foreground mb-2 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" /> Top neighbors
          </h3>
          {topBuyers.length === 0 || !topBuyers[0]?.totalSpend ? (
            <p className="text-sm text-muted-foreground text-center py-6">No spending yet.</p>
          ) : (
            topBuyers.map((b, i) => (
              <LeaderboardRow key={b.id} rank={i} name={b.full_name || "Neighbor"}
                sub={`${b.resolved_city || b.state || "—"} · ${b.jobs_completed || 0} jobs`}
                value={money(b.totalSpend)} valueLabel="spent" />
            ))
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-soft p-4">
        <h3 className="text-[14px] font-bold text-foreground mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" /> Geographic distribution
        </h3>
        {geoData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No location data yet.</p>
        ) : (
          <div className="space-y-2.5">
            {geoData.map(([city, count]) => {
              const max = geoData[0][1] || 1;
              return (
                <div key={city} className="flex items-center gap-3">
                  <div className="w-28 text-xs text-muted-foreground truncate shrink-0">{city}</div>
                  <div className="flex-1 h-6 bg-secondary rounded-lg overflow-hidden">
                    <div className="h-full rounded-lg bg-primary/70" style={{ width: `${(count / max) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold text-foreground w-8 text-right shrink-0">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}