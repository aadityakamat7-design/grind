import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import TeenIdentityGate from "@/components/grind/teen/TeenIdentityGate";
import SlideToConfirm from "@/components/grind/SlideToConfirm";

export default function AcceptJobButton({ job, teen, onAccepted }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [gateOpen, setGateOpen] = useState(false);

  const accept = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await base44.functions.invoke("acceptJobPost", { jobId: job.id });
      // The booking is created in pending_parent_approval either way. If the
      // teen hasn't verified their identity yet, open the verification gate —
      // the parent can only approve once the teen is verified.
      if (res.data?.identityRequired) {
        setGateOpen(true);
      }
      onAccepted?.();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't take this job. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <TeenIdentityGate
        open={gateOpen}
        onOpenChange={setGateOpen}
        onVerified={() => { setGateOpen(false); onAccepted?.(); }}
      />
      <SlideToConfirm
        label="Slide to accept job"
        loadingLabel="Taking job..."
        loading={saving}
        onConfirm={accept}
      />
      {error && <p className="text-xs text-destructive font-semibold">{error}</p>}
    </div>
  );
}