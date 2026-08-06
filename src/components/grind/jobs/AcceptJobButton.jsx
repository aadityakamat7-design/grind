import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Lock } from "lucide-react";
import TeenIdentityGate from "@/components/grind/teen/TeenIdentityGate";
import SlideToConfirm from "@/components/grind/SlideToConfirm";

export default function AcceptJobButton({ job, teen, onAccepted }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [gateOpen, setGateOpen] = useState(false);

  const ineligible = job.eligible_for_user === false;

  const accept = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await base44.functions.invoke("acceptJobPost", { jobId: job.id });
      // If the teen hasn't verified their identity yet, open the verification
      // gate. For 18+ teens the booking is already confirmed; for minors it
      // stays pending parent approval until the teen is verified.
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
      {ineligible ? (
        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2.5 text-sm text-destructive">
          <Lock className="w-4 h-4 shrink-0" />
          <span>{job.ineligible_reason || `Requires age ${job.category_min_age}+ in ${job.state}`}</span>
        </div>
      ) : (
        <SlideToConfirm
          label="Slide to accept job"
          loadingLabel="Taking job..."
          loading={saving}
          onConfirm={accept}
        />
      )}
      {error && <p className="text-xs text-destructive font-semibold">{error}</p>}
    </div>
  );
}