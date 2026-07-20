import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Switch } from "@/components/ui/switch";

export default function AvailabilityToggle({ profile, onChanged }) {
  const available = profile.is_available !== false;
  const [saving, setSaving] = useState(false);

  const toggle = async (v) => {
    setSaving(true);
    await base44.entities.TeenProfile.update(profile.id, { is_available: v });
    setSaving(false);
    onChanged?.();
  };

  return (
    <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-center gap-2.5">
        <span className={`w-2.5 h-2.5 rounded-full ${available ? "bg-emerald-500" : "bg-slate-300"}`} />
        <div>
          <p className="font-bold text-slate-900 text-sm">{available ? "Available now" : "Busy"}</p>
          <p className="text-xs text-slate-500">
            {available ? "Neighbors can find you in search." : "You're hidden from search results."}
          </p>
        </div>
      </div>
      <Switch checked={available} disabled={saving} onCheckedChange={toggle} />
    </div>
  );
}