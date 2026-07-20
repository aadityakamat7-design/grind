import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useOutletContext } from "react-router-dom";
import { money } from "@/lib/grind";
import { Button } from "@/components/ui/button";
import { Download, DollarSign } from "lucide-react";
import { format } from "date-fns";

export default function Earnings() {
  const { user } = useOutletContext();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Booking.filter({ teen_user_id: user.id, status: "completed" }, "-created_date", 200)
      .then((bks) => { setBookings(bks); setLoading(false); });
  }, [user.id]);

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;

  const rows = bookings.map((b) => ({
    date: b.buyer_confirmed_at || b.updated_date,
    title: b.listing_title,
    gross: b.price_total,
    fee: b.platform_fee || 0,
    net: b.price_total - (b.platform_fee || 0),
  }));
  const totalNet = rows.reduce((s, r) => s + r.net, 0);

  const exportCSV = () => {
    const header = "Date,Job,Gross,Platform Fee,Net\n";
    const body = rows.map((r) =>
      `${format(new Date(r.date), "yyyy-MM-dd")},"${r.title}",${r.gross.toFixed(2)},${r.fee.toFixed(2)},${r.net.toFixed(2)}`
    ).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `grind-earnings-${new Date().getFullYear()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Earnings</h1>
        <p className="text-muted-foreground text-sm">All payouts go to your parent's account.</p>
      </div>

      <div className="bg-primary text-primary-foreground rounded-2xl p-6">
        <div className="text-sm opacity-80">Total earned</div>
        <div className="font-display text-4xl font-extrabold">{money(totalNet)}</div>
        <div className="text-xs opacity-80 mt-1">{rows.length} completed job{rows.length !== 1 ? "s" : ""}</div>
      </div>

      {rows.length > 0 && (
        <Button variant="outline" className="w-full rounded-full" onClick={exportCSV}>
          <Download className="w-4 h-4 mr-2" /> Export CSV (for taxes)
        </Button>
      )}

      <div className="bg-muted rounded-2xl p-4 text-xs text-muted-foreground">
        💡 Heads up: if you net $400+ in self-employment earnings this year, you'll generally need to file a tax return. This export makes that easy — ask your parent!
      </div>

      {rows.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <DollarSign className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="font-heading font-semibold">No earnings yet</p>
          <p className="text-sm text-muted-foreground">Complete your first job to start the tracker.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
              <div>
                <div className="font-heading font-semibold text-sm">{r.title}</div>
                <div className="text-xs text-muted-foreground">{format(new Date(r.date), "MMM d, yyyy")}</div>
              </div>
              <div className="text-right">
                <div className="font-display font-bold">{money(r.net)}</div>
                <div className="text-xs text-muted-foreground">after {money(r.fee)} fee</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}