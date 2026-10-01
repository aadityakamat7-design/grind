import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";

// Lets an onboarded parent link another teen. The connection code is collected
// here, then the full consent flow runs on the onboarding screen — the state
// child-labor rules, the itemized consent, and the teen's date of birth are all
// required, so this path can't shortcut them.
export default function LinkTeenCard() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const cont = () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) {
      setError("Enter the connection code your teen generated in their app.");
      return;
    }
    window.location.href = `/onboarding?role=parent&code=${encodeURIComponent(trimmed)}`;
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-5 space-y-3">
      <p className="font-bold text-foreground flex items-center gap-1.5">
        <UserPlus className="w-4 h-4 text-primary" /> Link a student
      </p>
      <p className="text-xs text-muted-foreground">
        Enter the connection code your teen generated in their app. You'll review the state rules, confirm your
        relationship, and confirm their date of birth next.
      </p>
      <div>
        <Label className="text-foreground">Teen's connection code</Label>
        <Input
          className="rounded-xl mt-1 uppercase tracking-widest font-bold text-center text-lg"
          placeholder="ABCD1234"
          maxLength={8}
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(""); }}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button className="w-full rounded-xl" disabled={!code.trim()} onClick={cont}>
        Continue
      </Button>
    </div>
  );
}