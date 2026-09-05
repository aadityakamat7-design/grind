import React from "react";
import { Link } from "react-router-dom";
import StripeBadge from "@/components/StripeBadge";
import NortonBadge from "@/components/NortonBadge";

// Compact site-wide footer — brand + copyright and links on one row on desktop,
// wrapping gracefully on mobile. Trust badges sit on a single line beneath.
export default function SiteFooter() {
  const links = [
    { to: "/terms", label: "Terms" },
    { to: "/privacy", label: "Privacy" },
    { to: "/safety", label: "Safety" },
    { to: "/support", label: "Support" },
    { to: "/about", label: "About" },
    { to: "/compliance", label: "Payments & Compliance" },
  ];
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <Link to="/" className="font-semibold text-foreground hover:text-primary transition-colors">
              Blockwork
            </Link>
            <span className="text-border">·</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <nav className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px] text-muted-foreground">
            {links.map((l, i) => (
              <React.Fragment key={l.to}>
                {i > 0 && <span className="hidden sm:inline text-border/60">·</span>}
                <Link to={l.to} className="hover:text-foreground transition-colors min-h-[28px] inline-flex items-center">
                  {l.label}
                </Link>
              </React.Fragment>
            ))}
          </nav>
        </div>
        <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-border/50">
          <StripeBadge showText={false} />
          <NortonBadge />
        </div>
      </div>
    </footer>
  );
}