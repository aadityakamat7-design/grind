import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StatCard({ icon: Icon, label, value, subtitle, to, onClick, accent = "text-primary", className }) {
  const content = (
    <>
      <div className="flex items-center justify-between">
        {Icon && <Icon className={cn("w-5 h-5", accent)} />}
        {subtitle && <span className="text-[11px] text-muted-foreground font-medium">{subtitle}</span>}
      </div>
      <div>
        <p className="text-xl font-extrabold text-foreground tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </>
  );

  const base = cn(
    "bg-card rounded-2xl border border-border shadow-soft p-4 text-left transition-all min-h-[88px] flex flex-col justify-between gap-2",
    "min-w-[44px] min-h-[88px]",
    to || onClick ? "hover:shadow-card hover:border-primary/20 cursor-pointer active:scale-[0.98]" : "",
    className
  );

  if (to) {
    return (
      <Link to={to} className={base}>
        {content}
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 absolute top-3.5 right-3.5" />
      </Link>
    );
  }
  if (onClick) {
    return (
      <button onClick={onClick} className={cn(base, "relative w-full")}>
        {content}
      </button>
    );
  }
  return <div className={base}>{content}</div>;
}