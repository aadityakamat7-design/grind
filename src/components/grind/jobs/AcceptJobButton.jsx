import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Lock, MessageSquare } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import SlideToConfirm from "@/components/grind/SlideToConfirm";

const MIN_PITCH = 20;

export default function AcceptJobButton({ job, teen, onAccepted }) {
  const [pitch, setPitch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const ineligible = job.eligible_for_user === false;
  const pitchValid = pitch.trim().length >= MIN_PITCH;

  const accept = async () => {
    if (!pitchValid) return;
    setSaving(true);
    setError("");
    try {
      await base44.functions.invoke("acceptJobPost", { jobId: job.id, pitch: pitch.trim() });
      onAccepted?.();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't take this job. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (ineligible) {
    return (
      <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2.5 text-sm text-destructive">
        <Lock className="w-4 h-4 shrink-0" />
        <span>{job.ineligible_reason || `Requires age ${job.category_min_age}+ in ${job.state}`}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          Why you're a good fit
        </Label>
        <Textarea
          className="rounded-xl text-sm"
          maxLength={500}
          rows={3}
          placeholder="Tell the neighbor why they should pick you — your experience, tools you have, or why you're reliable."
          value={pitch}
          onChange={(e) => setPitch(e.target.value)}
        />
        <div className="flex items-center justify-between text-xs">
          <span className={pitchValid ? "text-muted-foreground" : "text-muted-foreground/70"}>
            {pitchValid ? "Looks good!" : `At least ${MIN_PITCH} characters`}
          </span>
          <span className="text-muted-foreground/60">{pitch.length}/500</span>
        </div>
      </div>
      <SlideToConfirm
        label="Slide to accept job"
        loadingLabel="Taking job..."
        loading={saving}
        disabled={!pitchValid}
        onConfirm={accept}
      />
      {error && <p className="text-xs text-destructive font-semibold">{error}</p>}
    </div>
  );
}