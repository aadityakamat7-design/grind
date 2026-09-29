import React from "react";
import AdminActionDialog from "@/components/grind/admin/AdminActionDialog";
import { adminInvoke, SUSPENSION_REASONS } from "@/lib/adminApi";

const ROLE_LABELS = { teen: "Teen", parent: "Parent", buyer: "Neighbor", admin: "Admin" };

// Pause an account, or lift the pause. The rules are the shared ones: a reason
// is required, and the change lands in the audit log with the value before it.
export default function AdminSuspendDialog({ open, onOpenChange, target, onDone }) {
  const suspend = target?.account_status !== "suspended";
  const name = target?.full_name || target?.email || "this account";

  return (
    <AdminActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={suspend ? "Put this account on hold" : "Lift the hold on this account"}
      description={
        suspend
          ? "New jobs, bookings, listings and messages stop straight away. The person keeps their account, their records, and their money."
          : "The account can take jobs, hire, post and message again."
      }
      reasons={SUSPENSION_REASONS}
      destructive={suspend}
      confirmLabel={suspend ? "Put on hold" : "Lift the hold"}
      summary={
        <>
          <Row label="Account" value={name} />
          <Row label="Email" value={target?.email || "—"} />
          <Row label="Role" value={ROLE_LABELS[target?.role] || target?.role || "—"} />
          <Row
            label="What changes"
            value={suspend
              ? "New jobs, bookings, listings and messages stop immediately. Work already booked stays booked — use the booking tools to cancel or hold anything that needs to end. This account also disappears from neighbor search."
              : "All of that is available to them again, and they show up in search once more."}
          />
        </>
      }
      warning={suspend
        ? "The person is notified and told to contact support. Anything already booked keeps running until you cancel or hold it from the booking tools."
        : undefined}
      onConfirm={async ({ reason_code, reason_note }) => {
        await adminInvoke("adminSetAccountSuspension", {
          userId: target.id,
          suspended: suspend,
          reason_code,
          reason_note,
        });
        onDone?.();
      }}
    />
  );
}

function Row({ label, value }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}