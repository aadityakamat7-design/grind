import React, { useState } from "react";
import { HelpCircle } from "lucide-react";
import SectionCard from "@/components/account/SectionCard";

// Fields the person can see but not edit, each with a one-line reason and what
// to do instead. Kept visually greyed so it reads as "not yours to change".
export default function LockedFieldsCard({ locked }) {
  const [open, setOpen] = useState("");
  if (!locked?.length) return null;

  return (
    <SectionCard icon={HelpCircle} title="Locked fields" description="A few details can't be changed from here. Tap any of them to see why.">
      <div className="space-y-2">
        {locked.map((item) => (
          <div key={item.field} className="rounded-xl bg-secondary/60 border border-border">
            <button
              type="button"
              onClick={() => setOpen(open === item.field ? "" : item.field)}
              className="w-full flex items-center justify-between gap-3 p-3.5 text-left"
            >
              <span className="text-[13px] font-semibold text-muted-foreground">{item.field}</span>
              <span className="text-[11px] font-medium text-primary shrink-0">
                {open === item.field ? "Hide" : "Why can't I change this?"}
              </span>
            </button>
            {open === item.field && (
              <div className="px-3.5 pb-3.5 space-y-1">
                <p className="text-[12px] text-muted-foreground">{item.why}</p>
                <p className="text-[11px] text-muted-foreground">{item.help}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}