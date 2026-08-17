import React from "react";

export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h1 className="text-[26px] lg:text-[28px] font-extrabold tracking-tight text-foreground leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[14px] text-muted-foreground mt-1 leading-relaxed">{subtitle}</p>
        )}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}