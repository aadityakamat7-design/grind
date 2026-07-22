import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Hand } from "lucide-react";

export default function AcceptJobButton({ job, teen, onAccepted }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const accept = async () => {
    setSaving(true);
    setError("");
    try {
      await base44.functions.invoke("acceptJobPost", { jobId: job.id });
      onAccepted?.();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't take this job. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button className="w-full rounded-xl" disabled={saving} onClick={accept}>
        <Hand className="w-4 h-4 mr-2" /> {saving ? "Taking job..." : "Take this job"}
      </Button>
      {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
    </div>
  );
}