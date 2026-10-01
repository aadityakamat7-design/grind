import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

// One place for the error / success boxes on the entry screens.
export default function AuthMessage({ kind = "error", children }) {
  if (!children) return null;
  const ok = kind === "success";
  const Icon = ok ? CheckCircle2 : AlertCircle;
  return (
    <div
      role={ok ? "status" : "alert"}
      className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${
        ok ? "bg-success/10 border-success/30 text-foreground" : "bg-destructive/10 border-destructive/20 text-destructive"
      }`}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <span className="min-w-0">{children}</span>
    </div>
  );
}