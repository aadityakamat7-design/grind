import React from "react";
import { Link } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { ExternalLink, PauseCircle, StickyNote } from "lucide-react";
import StatusBadge from "@/components/grind/StatusBadge";
import { money } from "@/lib/grind";
import { computeBookingBadge } from "@/lib/bookingStatus";
import AdminBookingTimeline from "./AdminBookingTimeline";
import AdminBookingActions from "./AdminBookingActions";
import AdminBookingThread from "./AdminBookingThread";
import AdminAuditLogPanel from "./AdminAuditLogPanel";

// The admin's booking workspace: full timeline with Stripe IDs, linked
// accounts, the message thread and reports, internal notes, every support
// action, and the audit trail for this booking.
export default function AdminBookingDetail({ booking, reports, onClose, onReload }) {
  if (!booking) return null;

  const badge = computeBookingBadge(booking);
  const notes = Array.isArray(booking.admin_notes) ? booking.admin_notes : [];

  return (
    <Dialog open={!!booking} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{booking.listing_title}</DialogTitle>
          <DialogDescription>
            {booking.delivery_mode === "online" ? "Online session" : "In-person job"} · booked{" "}
            {booking.created_date ? new Date(booking.created_date).toLocaleDateString() : "—"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={badge} />
          <StatusBadge status={booking.payment_status} />
          {booking.payout_hold && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
              <PauseCircle className="w-3.5 h-3.5" /> Payout on hold
            </span>
          )}
          {booking.is_test_mode && (
            <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Test mode
            </span>
          )}
        </div>

        {booking.payout_hold_reason && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
            Hold reason: {booking.payout_hold_reason}
          </p>
        )}

        {/* Linked accounts */}
        <div>
          <p className="font-bold text-foreground text-sm mb-2">Linked accounts</p>
          <div className="grid sm:grid-cols-3 gap-2">
            <Account
              role="Neighbor"
              name={booking.buyer_name}
              userId={booking.buyer_user_id}
              to={`/neighbors/${booking.buyer_user_id}`}
            />
            <Account
              role="Teen"
              name={booking.teen_display_name}
              userId={booking.teen_user_id}
              to={`/teens/${booking.teen_user_id}`}
            />
            <Account role="Parent" name={null} userId={booking.parent_user_id} />
          </div>
        </div>

        {/* Facts + money */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-secondary rounded-xl p-3">
          <Field label="Scheduled" value={booking.scheduled_start ? new Date(booking.scheduled_start).toLocaleString() : "—"} />
          <Field label="Address" value={booking.address || (booking.delivery_mode === "online" ? "Online" : "—")} />
          <Field label="Payout status" value={String(booking.payout_status || "—").replace(/_/g, " ")} />
          <Field label="Price total" value={money(booking.price_total)} />
          <Field label="Charged" value={money(booking.charge_amount)} />
          <Field label="Platform fee" value={money(booking.platform_fee)} />
          <Field label="Net to teen" value={money(booking.net_amount)} />
          <Field label="Tip" value={money(booking.tip_amount)} />
          <Field label="Refunded by support" value={money(booking.admin_refund_amount)} />
        </div>

        {booking.dispute_reason && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
            <p className="font-bold text-rose-800 text-xs mb-1">Dispute reason</p>
            <p className="text-sm text-rose-700">{booking.dispute_reason}</p>
            <p className="text-[11px] text-rose-700/80 mt-1">
              Resolution recorded: {String(booking.admin_resolution || "none").replace(/_/g, " ")}
            </p>
          </div>
        )}

        {/* Support actions */}
        <div>
          <p className="font-bold text-foreground text-sm mb-2">Support actions</p>
          <AdminBookingActions booking={booking} onDone={onReload} />
        </div>

        <AdminBookingThread booking={booking} reports={reports} />

        {/* Internal notes */}
        <div>
          <p className="font-bold text-foreground text-sm mb-2 flex items-center gap-1.5">
            <StickyNote className="w-4 h-4" /> Internal notes (admins only)
          </p>
          {notes.length === 0 ? (
            <p className="text-xs text-muted-foreground">No internal notes on this booking yet.</p>
          ) : (
            <div className="space-y-2">
              {notes.map((n, i) => (
                <div key={i} className="bg-muted rounded-xl p-2.5">
                  <p className="text-xs text-foreground whitespace-pre-wrap break-words">{n.note}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {n.admin_name || n.admin_user_id} · {n.at ? new Date(n.at).toLocaleString() : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <AdminBookingTimeline booking={booking} />

        <AdminAuditLogPanel bookingId={booking.id} />
      </DialogContent>
    </Dialog>
  );
}

function Account({ role, name, userId, to }) {
  return (
    <div className="border border-border rounded-xl p-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{role}</p>
      <p className="text-xs font-semibold text-foreground truncate">{name || userId || "—"}</p>
      {to && userId ? (
        <Link
          to={to}
          className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
        >
          View profile <ExternalLink className="w-3 h-3" />
        </Link>
      ) : (
        userId && <p className="text-[10px] text-muted-foreground break-all">{userId}</p>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-xs font-semibold text-foreground break-words">{value ?? "—"}</p>
    </div>
  );
}