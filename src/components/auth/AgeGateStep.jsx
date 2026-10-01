import React, { useState } from "react";
import { Loader2, ShieldAlert, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RolePicker from "@/components/grind/onboarding/RolePicker";
import { calcAge } from "@/lib/grind";
import { clearSignupProgress } from "@/lib/signupState";

const ROLE_NAMES = { teen: "a teen", parent: "a parent", buyer: "a neighbor" };
export const UNDERAGE_MESSAGE = "You need to be 13 or older to use Blockwork.";

// The same rules the server applies (startSignup / claimSignup). Shown here only
// for instant feedback — the server decides.
export function ageProblem(role, dob) {
  const age = calcAge(dob);
  if (age === null) return "Enter a valid date of birth.";
  if (age < 13) return UNDERAGE_MESSAGE;
  if (role === "teen" && age > 19) {
    return "Teen accounts are for ages 13–19. If you're an adult, go back and choose parent or neighbor.";
  }
  if (role !== "teen" && age < 18) return "You must be at least 18 to sign up as a parent or neighbor.";
  return "";
}

// Step 1 of sign-up — before any account exists: who you are, and your date of
// birth. Under 13 is stopped here and nothing is saved. `onSubmit(role, dob)`
// does the server call and returns { error } to show a message.
export default function AgeGateStep({ initialRole = null, onSubmit, notice = "" }) {
  const [role, setRole] = useState(initialRole);
  const [dob, setDob] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const age = dob ? calcAge(dob) : null;
  const independent = role === "teen" && age !== null && age >= 18 && age <= 19;

  const submit = async (e) => {
    e.preventDefault();
    const problem = ageProblem(role, dob);
    if (problem) {
      setError(problem);
      if (problem === UNDERAGE_MESSAGE) clearSignupProgress();
      return;
    }
    setError("");
    setLoading(true);
    const result = await onSubmit(role, dob);
    setLoading(false);
    if (result?.error) setError(result.error);
  };

  if (!role) {
    return (
      <div>
        {notice && (
          <p className="mb-4 rounded-xl bg-secondary border border-border p-3 text-sm text-foreground">{notice}</p>
        )}
        <RolePicker
          onSelect={(r) => {
            clearSignupProgress();
            setRole(r);
          }}
        />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {notice && (
        <p className="rounded-xl bg-secondary border border-border p-3 text-sm text-foreground">{notice}</p>
      )}
      <div className="flex items-center justify-between gap-2 rounded-xl bg-secondary border border-border px-3.5 py-2.5">
        <p className="text-sm text-foreground min-w-0">I'm {ROLE_NAMES[role]}</p>
        <button
          type="button"
          onClick={() => {
            clearSignupProgress();
            setRole(null);
            setDob("");
            setError("");
          }}
          className="text-xs font-semibold text-primary hover:underline shrink-0"
        >
          Change role
        </button>
      </div>
      <div>
        <Label htmlFor="age-dob" className="text-foreground">Your date of birth</Label>
        <Input
          id="age-dob"
          type="date"
          className="rounded-xl mt-1 h-12"
          max={new Date().toISOString().split("T")[0]}
          min="1900-01-01"
          value={dob}
          onChange={(e) => {
            setDob(e.target.value);
            setError("");
          }}
          autoComplete="bday"
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          We check your age first so we can set up the right account. It's never shown publicly.
        </p>
      </div>
      {independent && (
        <div className="flex items-start gap-2 rounded-xl bg-secondary border border-border p-3 text-xs text-foreground">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          At 18 you join as an independent teen — no parent link needed.
        </div>
      )}
      {error && (
        <div
          className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-sm text-destructive"
          role="alert"
        >
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      <Button type="submit" className="w-full h-12 font-medium" disabled={!dob || loading}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking...
          </>
        ) : (
          "Continue"
        )}
      </Button>
    </form>
  );
}