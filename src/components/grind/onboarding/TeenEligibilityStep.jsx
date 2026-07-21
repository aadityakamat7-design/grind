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
      <p className="text-sm text-slate-600">
        Rules for teen work vary by state. Tell us where you live and your date of birth so we can check you're good to go.
      </p>
      <div>
        <Label className="text-slate-800">Your state</Label>
        <select
          value={usState}
          onChange={(e) => { setUsState(e.target.value); setError(""); }}
          className="mt-1 flex h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
        >
          <option value="">Select your state…</option>
          {US_STATES.map((s) => (
            <option key={s.code} value={s.code}>{s.name}</option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-slate-800">Date of birth</Label>
        <Input
          type="date"
          className="rounded-xl mt-1 h-12 text-slate-900"
          value={dob}
          onChange={(e) => { setDob(e.target.value); setError(""); }}
        />
      </div>
      {error && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      <div className="flex items-start gap-2 bg-blue-50 rounded-xl p-3 text-xs text-blue-800">
        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
        We check your state's minimum working age for casual jobs like babysitting, tutoring, and lawn care.
      </div>
      <Button className="w-full rounded-xl h-12 font-bold" disabled={!dob || !usState} onClick={submit}>
        Check my eligibility
      </Button>
    </div>
  );
}