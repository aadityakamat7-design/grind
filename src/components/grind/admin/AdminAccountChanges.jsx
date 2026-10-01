import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ShieldAlert, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Admins can see every sensitive account change — email, legal name, address,
// date of birth, payout details and a parent's teen controls — with the old
// value, the new value and when it happened.
const TRACKED = [
  "account_email_changed", "account_name_changed", "account_password_changed",
  "account_address_added", "account_address_changed", "account_address_removed",
  "account_zip_changed", "account_zone_changed", "account_dob_changed",
  "account_payout_changed", "account_password_set_link_sent",
  "parent_teen_control", "teen_profile_changed", "booking_address_changed",
  "account_change_reported", "account_deleted", "account_data_exported",
];

const LABELS = {
  account_email_changed: "Email changed",
  account_name_changed: "Legal name changed",
  account_password_changed: "Password changed",
  account_password_set_link_sent: "Password link sent",
  account_address_added: "Address added",
  account_address_changed: "Address changed",
  account_address_removed: "Address removed",
  account_zip_changed: "ZIP code changed",
  account_dob_changed: "Date of birth changed",
  account_payout_changed: "Payout details changed",
  parent_teen_control: "Parent control",
  teen_profile_changed: "Teen profile changed",
  booking_address_changed: "Job address changed",
  account_change_reported: "Change disputed",
  account_deleted: "Account deleted",
  account_data_exported: "Data exported",
};

export default function AdminAccountChanges() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const logs = await base44.entities.AuditLog.list("-created_date", 300);
        setRows(logs.filter((l) => TRACKED.includes(l.action)));
      } catch (err) {
        console.error("AdminAccountChanges load failed:", err);
        setError("Couldn't load the account change log.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border p-4 h-16 skeleton-shimmer" />
        ))}
      </div>
    );
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>;

  if (!rows.length) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 text-center">
        <History className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-semibold text-foreground">No account changes yet</p>
        <p className="text-[12px] text-muted-foreground mt-1">
          Email, legal name, address, date of birth, payout and parent-control changes appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <p className="text-[12px] text-muted-foreground">
        Every sensitive change to someone's own account, newest first. Old and new values are kept for review.
      </p>
      {rows.map((row) => (
        <div key={row.id} className="bg-card rounded-2xl border border-border p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground flex items-center gap-2">
                {row.action === "account_change_reported" && <ShieldAlert className="w-3.5 h-3.5 text-destructive" />}
                {LABELS[row.action] || row.action}
              </p>
              <p className="text-[12px] text-muted-foreground break-words">{row.summary}</p>
            </div>
            <Badge variant="outline" className="rounded-full text-[10px] shrink-0">
              {row.created_date ? new Date(row.created_date).toLocaleString() : ""}
            </Badge>
          </div>
          {row.metadata && Object.keys(row.metadata).length > 0 && (
            <div className="rounded-xl bg-secondary/60 p-2.5 text-[11px] text-muted-foreground space-y-0.5">
              {Object.entries(row.metadata).map(([key, value]) => (
                <p key={key} className="break-words">
                  <span className="font-semibold">{key.replace(/_/g, " ")}:</span>{" "}
                  {typeof value === "object" ? JSON.stringify(value) : String(value)}
                </p>
              ))}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            {row.actor_role ? `${row.actor_role} · ` : ""}account {row.actor_user_id?.slice(-6)}
            {row.ip ? ` · ${row.ip}` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}