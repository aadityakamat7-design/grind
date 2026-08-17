import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Users, Search, CalendarDays, Wallet, Flag, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/grind/PageHeader";
import MetricCard from "@/components/grind/admin/MetricCard";
import ReportRow from "@/components/grind/admin/ReportRow";
import PayoutReviewQueue from "@/components/grind/admin/PayoutReviewQueue";
import CredentialReviewQueue from "@/components/grind/admin/CredentialReviewQueue";
import StatusBadge from "@/components/grind/StatusBadge";
import { money } from "@/lib/grind";

export default function Admin() {
  const { user } = useOutletContext();
  const [teens, setTeens] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reports, setReports] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (user?.app_role !== "admin") return;
    const [t, b, bk, r, creds] = await Promise.all([
      base44.entities.TeenProfile.list("-created_date", 200),
      base44.entities.BuyerProfile.list("-created_date", 200),
      base44.entities.Booking.list("-created_date", 200),
      base44.entities.Report.list("-created_date", 100),
      base44.entities.Credential.filter({ status: "pending" }, "-created_date", 100),
    ]);
    setTeens(t);
    setBuyers(b);
    setBookings(bk);
    setReports(r);
    setCredentials(creds);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (user?.app_role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Users className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-lg font-bold text-foreground">Admins only</p>
        <p className="text-[14px] text-muted-foreground mt-1">You don't have access to this page.</p>
      </div>
    );
  }

  const resolve = async (report) => {
    setActing(true);
    await base44.entities.Report.update(report.id, { status: "resolved" });
    setActing(false);
    load();
  };

  const hideReview = async (report) => {
    setActing(true);
    await base44.entities.Review.update(report.review_id, { hidden: true });
    await base44.entities.Report.update(report.id, { status: "resolved" });
    setActing(false);
    load();
  };

  if (loading)
    return (
      <div className="flex justify-center py-24">
        <div className="w-8 h-8 border-[3px] border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );

  const gmv = bookings
    .filter((b) => !["cancelled", "denied"].includes(b.status))
    .reduce((s, b) => s + (b.price_total || 0), 0);
  const openReports = reports.filter((r) => r.status === "open");

  return (
    <div className="space-y-6">
      <PageHeader title="Admin console" subtitle="Marketplace health, moderation, and verifications." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard icon={Users} label="Teens" value={teens.length} />
        <MetricCard icon={Search} label="Neighbors" value={buyers.length} accent="text-primary" />
        <MetricCard icon={CalendarDays} label="Bookings" value={bookings.length} accent="text-emerald-600" />
        <MetricCard icon={Wallet} label="GMV" value={money(gmv)} accent="text-amber-600" />
      </div>

      <PayoutReviewQueue bookings={bookings} onDone={load} />

      <CredentialReviewQueue credentials={credentials} onDone={load} />

      <section>
        <h2 className="text-[17px] font-bold text-foreground mb-3 flex items-center gap-2">
          <Flag className="w-[18px] h-[18px] text-rose-500" /> Reports {openReports.length > 0 && `(${openReports.length} open)`}
        </h2>
        {reports.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-6 text-center">
            <p className="text-[14px] text-muted-foreground">No reports filed.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => <ReportRow key={r.id} report={r} onResolve={resolve} onHideReview={hideReview} acting={acting} />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-[17px] font-bold text-foreground mb-3 flex items-center gap-2">
          <Users className="w-[18px] h-[18px]" /> Teen management
        </h2>
        {teens.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-6 text-center">
            <p className="text-[14px] text-muted-foreground">No teens yet.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {teens.map((t) => (
              <div key={t.id} className="flex items-center justify-between bg-card rounded-2xl border border-border shadow-soft p-4">
                <div className="min-w-0">
                  <p className="font-bold text-foreground text-[14px] truncate">{t.display_name}</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">{t.resolved_city || t.state || "—"}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  disabled={acting}
                  onClick={async () => {
                    setActing(true);
                    await base44.entities.TeenProfile.update(t.id, { status: t.status === "suspended" ? "active" : "suspended" });
                    setActing(false);
                    load();
                  }}
                >
                  {t.status === "suspended" ? "Unsuspend" : "Suspend"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-[17px] font-bold text-foreground mb-3 flex items-center gap-2">
          <BadgeCheck className="w-[18px] h-[18px] text-primary" /> Neighbor verifications
        </h2>
        {buyers.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-6 text-center">
            <p className="text-[14px] text-muted-foreground">No neighbors yet.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {buyers.map((b) => (
              <div key={b.id} className="flex items-center justify-between bg-card rounded-2xl border border-border shadow-soft p-4">
                <div className="min-w-0">
                  <p className="font-bold text-foreground text-[14px] truncate">{b.full_name || "Neighbor"}</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">ZIP {b.zip || "—"}</p>
                </div>
                <StatusBadge status={b.id_verification_status === "verified" ? "active" : "pending"} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}