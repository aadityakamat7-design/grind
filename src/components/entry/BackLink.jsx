import React from "react";
import { ArrowLeft } from "lucide-react";

// The "back to the previous step" link used on every sign-up step.
export default function BackLink({ onClick, children = "Back" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground mb-4"
    >
      <ArrowLeft className="w-3.5 h-3.5" /> {children}
    </button>
  );
}