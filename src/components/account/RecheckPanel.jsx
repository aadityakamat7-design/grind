import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, ShieldAlert } from "lucide-react";
import { base44 } from "@/api/base44Client";

const PROVIDER_LABELS = { google: "Google", apple: "Apple", facebook: "Facebook" };

// Shown inside a card when the last time this person proved who they are is
// more than 15 minutes old. Accounts with a password type it; accounts that
// only use Google / Apple / Facebook sign in with that provider again.
export default function RecheckPanel({ provider, password, onPasswordChange, busy, note }) {
  const isProvider = provider && provider !== "password" && provider !== "";

  if (isProvider) {
    const label = PROVIDER_LABELS[provider] || "your provider";
    return (
      <div className="rounded-xl bg-secondary p-3.5 space-y-3">
        <p className="text-xs text-muted-foreground flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
          {note || `For your safety, sign in with ${label} again if it has been more than 15 minutes.`}
        </p>
        <Button
          type="button"
          className="w-full rounded-full"
          disabled={busy}
          onClick={() => base44.auth.loginWithProvider(provider, window.location.href)}
        >
          Sign in with {label} again
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-secondary p-3.5 space-y-2.5">
      <p className="text-xs text-muted-foreground flex items-start gap-2">
        <Lock className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
        {note || "For your safety, confirm your password if it has been more than 15 minutes since you signed in."}
      </p>
      <Input
        type="password"
        autoComplete="current-password"
        className="rounded-xl bg-card"
        placeholder="Your current password"
        value={password || ""}
        onChange={(e) => onPasswordChange?.(e.target.value)}
      />
    </div>
  );
}