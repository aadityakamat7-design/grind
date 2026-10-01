import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { BellRing, Lock } from "lucide-react";
import { callAccountFunction } from "@/lib/accountApi";
import SectionCard from "@/components/account/SectionCard";

const TYPES = [
  { key: "bookings", label: "Bookings and job updates" },
  { key: "messages", label: "New messages" },
  { key: "approvals", label: "Approvals waiting for me" },
  { key: "payouts", label: "Payouts and earnings" },
  { key: "reports", label: "Safety reports and account alerts" },
  { key: "weekly_summary", label: "Weekly parent summary" },
  { key: "marketing", label: "Tips, news and offers" },
];

// Per-type switches, separate for email and in-app. Security and account
// emails (password changed, suspicious sign-in) are not listed because they
// always send.
export default function NotificationsCard({ data, onSaved }) {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState(data.preferences || {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (type, channel, value) => {
    setPrefs((prev) => ({ ...prev, [type]: { ...(prev[type] || { email: true, in_app: true }), [channel]: value } }));
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await callAccountFunction("accountProfile", { notifications: prefs });
      toast({ title: "Notification settings saved" });
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard icon={BellRing} title="Notifications" description="Choose what reaches you, and how.">
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
        <span />
        <span className="text-center">Email</span>
        <span className="text-center">In-app</span>
      </div>

      <div className="divide-y divide-border">
        {TYPES.map((t) => (
          <div key={t.key} className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center py-2.5">
            <span className="text-[13px] font-medium text-foreground pr-1">{t.label}</span>
            <Switch
              checked={prefs?.[t.key]?.email !== false}
              onCheckedChange={(v) => set(t.key, "email", v)}
              aria-label={`${t.label} email`}
            />
            <Switch
              checked={prefs?.[t.key]?.in_app !== false}
              onCheckedChange={(v) => set(t.key, "in_app", v)}
              aria-label={`${t.label} in-app`}
            />
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
        <Lock className="w-3 h-3 mt-0.5 shrink-0" />
        Security and account emails — password changes, sign-in alerts — always send and can't be turned off.
      </p>

      {error && <p className="text-xs text-destructive font-medium">{error}</p>}

      <Button className="w-full rounded-full" disabled={saving} onClick={save}>
        {saving ? "Saving…" : "Save notification settings"}
      </Button>
    </SectionCard>
  );
}