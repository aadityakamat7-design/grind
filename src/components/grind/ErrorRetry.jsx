import React from "react";
import { AlertCircle, RotateCw } from "lucide-react";

export default function ErrorRetry({ onRetry, message = "Couldn't load — tap to retry" }) {
  return (
    <button
      onClick={onRetry}
      className="w-full flex flex-col items-center justify-center text-center py-16 px-6 gap-3"
    >
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-destructive" />
      </div>
      <p className="text-sm font-medium text-destructive">{message}</p>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <RotateCw className="w-3.5 h-3.5" /> Tap to retry
      </span>
    </button>
  );
}