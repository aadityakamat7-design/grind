import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, Flag, Wallet, AlertTriangle, CheckCircle2 } from "lucide-react";
import { money } from "@/lib/grind";

export default function SafetyEscrowCenter({ bookings, reports, onResolveReport, acting }) {
  const escrowHeld = bookings.filter((b) => b.payment_status === "held");
  const escrowReleasing = bookings.filter((b) => b.payment_status === "releasing");
  const escrowReleased = bookings.filter((b) => b.payment_status === "released");
  const escrowRefunded = bookings.filter((b) => b.payment_status === "refunded");
  const totalHeld = escrowHeld.reduce((s, b) => s + (b.charge_amount || b.price_total || 0), 0);
  const totalReleasing = escrowReleasing.reduce((s, b) => s + (b.charge_amount || b.price_total || 0), 0);

  const openReports = reports.filter((r) => r.status === "open");
  const urgentReports = openReports.filter((r) => r.priority === "urgent");

  const flaggedBookings = bookings.filter(
    (b) => b.dispute_flagged_at || b.buyer_disputed_at || b.status === "disputed"
  );

  return (
    <div className="space-y-4">
      {/* Escrow Balance */}
      <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="w-5 h-5 text-primary" />
          <h2 className="text-[17px] font-bold text-foreground">Escrow Balance</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
            <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">Held in escrow</p>
            <p className="text-2xl font-bold text-foreground mt-1">{money(totalHeld)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{escrowHeld.length} bookings</p>
          </div>
          <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
            <p className="text-[11px] font-semibold text-primary uppercase tracking-wide">Releasing</p>
            <p className="text-2xl font-bold text-foreground mt-1">{money(totalReleasing)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{escrowReleasing.length} bookings</p>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">Released</p>
            <p className="text-2xl font-bold text-foreground mt-1">{escrowReleased.length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">all time</p>
          </div>
          <div className="rounded-xl bg-red-50 border border-red-100 p-4">
            <p className="text-[11px] font-semibold text-red-700 uppercase tracking-wide">Refunded</p>
            <p className="text-2xl font-bold text-foreground mt-1">{escrowRefunded.length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">all time</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Pending Safety Reports */}
        <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              <h2 className="text-[17px] font-bold text-foreground">Pending Safety Reports</h2>
            </div>
            {urgentReports.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-600 text-white">
                {urgentReports.length} URGENT
              </span>
            )}
          </div>
          {openReports.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No pending reports.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[400px] overflow-y-auto">
              {openReports.map((r) => (
                <div
                  key={r.id}
                  className={`rounded-xl border p-3 ${r.priority === "urgent" ? "border-red-200 bg-red-50" : "border-border bg-muted/30"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {r.priority === "urgent" && <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />}
                        <p className="text-sm font-semibold text-foreground truncate">
                          {r.subject_name || "General report"}
                        </p>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {r.reason?.replace(/_/g, " ")} · {new Date(r.created_date).toLocaleDateString()}
                      </p>
                      {r.details && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.details}</p>}
                    </div>
                    <button
                      onClick={() => onResolveReport(r)}
                      disabled={acting}
                      className="text-[11px] font-semibold text-primary hover:underline shrink-0 disabled:opacity-50"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Flagged Job Completions */}
        <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
          <div className="flex items-center gap-2 mb-4">
            <Flag className="w-5 h-5 text-amber-600" />
            <h2 className="text-[17px] font-bold text-foreground">Flagged Job Completions</h2>
          </div>
          {flaggedBookings.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No flagged completions.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[400px] overflow-y-auto">
              {flaggedBookings.map((b) => (
                <Link
                  key={b.id}
                  to={`/bookings/${b.id}`}
                  className="block rounded-xl border border-amber-200 bg-amber-50/50 p-3 hover:bg-amber-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{b.listing_title || "Booking"}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {b.teen_display_name} · {b.buyer_name || "Neighbor"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {b.dispute_flagged_at && `Flagged ${new Date(b.dispute_flagged_at).toLocaleDateString()}`}
                        {b.buyer_disputed_at && `${b.dispute_flagged_at ? " · " : ""}Disputed ${new Date(b.buyer_disputed_at).toLocaleDateString()}`}
                      </p>
                      {b.dispute_reason && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.dispute_reason}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                        {b.status === "disputed" ? "DISPUTED" : "FLAGGED"}
                      </span>
                      <p className="text-[11px] text-muted-foreground mt-1">{money(b.charge_amount || b.price_total || 0)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}