import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Hand } from "lucide-react";
import TeenIdentityGate from "@/components/grind/teen/TeenIdentityGate";

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
      <Button className="w-full rounded-xl" disabled={saving} onClick={accept}>
        <Hand className="w-4 h-4 mr-2" /> {saving ? "Taking job..." : "Take this job"}
      </Button>
      {error && <p className="text-xs text-destructive font-semibold">{error}</p>}
    </div>
  );
}