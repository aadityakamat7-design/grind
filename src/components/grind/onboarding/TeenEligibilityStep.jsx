import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { US_STATES, checkEligibility, blockedMessage } from "@/lib/stateWorkRules";

export default function TeenEligibilityStep({ initialDob = "", initialState = "", onEligible }) {
  const [dob, setDob] = useState(initialDob);
  const [usState, setUsState] = useState(initialState);
  const [error, setError] = useState("");

  const submit = () => {
    const result = checkEligibility(dob, usState);
    if (result.status === "invalid") {
      setError("Please enter a valid date of birth and pick your state.");
      return;
    }
    if (result.status === "blocked") {
      setError(blockedMessage(result, usState));
      return;
    }
    setError("");
    onEligible({ dob, state: usState, result });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Rules for teen work vary by state. Tell us where you live and your date of birth so we can check you're good to go.
      </p>
      <div>
        <Label className="text-foreground">Your state</Label>
        <select
          value={usState}
          onChange={(e) => { setUsState(e.target.value); setError(""); }}
          className="mt-1 flex h-11 w-full rounded-xl border border-input bg-transparent px-3.5 text-sm font-normal shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring"
        >
          <option value="">Select your state…</option>
          {US_STATES.map((s) => (
            <option key={s.code} value={s.code}>{s.name}</option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-foreground">Date of birth</Label>
        <Input
          type="date"
          className="rounded-xl mt-1 h-11"
          value={dob}
          onChange={(e) => { setDob(e.target.value); setError(""); }}
        />
      </div>
      {error && (
        <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-sm text-destructive">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      <div className="flex items-start gap-2 bg-secondary border border-border rounded-xl p-3 text-xs text-muted-foreground">
        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
        Kickstart is for teens ages 13–19. We check your state's minimum working age for each job category — some categories (like lawn care) require a higher minimum age in certain states. Ages 18–19 use the platform independently without a parent.
      </div>
      <Button className="w-full rounded-xl h-12 font-medium" disabled={!dob || !usState} onClick={submit}>
        Check my eligibility
      </Button>
    </div>
  );
}