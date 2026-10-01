import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Switch } from "@/components/ui/switch";
import { Mail } from "lucide-react";

// Parent notification setting for the Sunday 6 PM weekly summary email.
export default function WeeklySummaryToggle({ user, onUpdated }) {
  const [on, setOn] = useState(user?.parent_weekly_summary !== false);
  const [saving, setSaving] = useState(false);

  const toggle = async (value) => {
    setSaving(true);
    setOn(value);
    try {
      await base44.auth.updateMe({ parent_weekly_summary: value });
      onUpdated?.();
    } catch (err) {
      console.error("weekly summary toggle:", err);
      setOn(!value);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary p-3.5">
      <div className="min-w-0 flex items-start gap-2.5">
        <Mail className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Weekly summary email</p>
          <p className="text-[11px] text-muted-foreground">
            Every Sunday at 6 PM — jobs, hours, earnings, upcoming bookings, and anything that needs you.
          </p>
        </div>
      </div>
      <Switch checked={on} disabled={saving} onCheckedChange={toggle} aria-label="Weekly summary email" />
    </div>
  );
}