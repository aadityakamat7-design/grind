import React from "react";

// The card shell every Account information section uses, so headings, spacing
// and the 375px layout stay identical across the screen.
export default function SectionCard({ icon: Icon, title, description, children, tone = "default" }) {
  return (
    <section className="bg-card rounded-2xl border border-border shadow-soft p-4 sm:p-5 space-y-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-foreground text-[15px] leading-tight">{title}</h2>
          {description && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>}
        </div>
      </div>
      {tone === "muted" ? <div className="text-muted-foreground">{children}</div> : children}
    </section>
  );
}