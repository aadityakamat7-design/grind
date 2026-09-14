import React from "react";
import { Link } from "react-router-dom";
import StripeBadge from "@/components/StripeBadge";
import NortonBadge from "@/components/NortonBadge";

// Compact, professional site footer — a quiet closing line.
// Single row of legal links + copyright + trust badges on desktop,
// wrapping cleanly on mobile with 44px tap targets.
export default function SiteFooter({ compact = false }) {
  const links = [
    { to: "/about", label: "About" },
    { to: "/terms", label: "Terms" },
    { to: "/privacy", label: "Privacy" },
    { to: "/support", label: "Support" },
    { to: "/safety", label: "Safety" },
    { to: "/compliance", label: "Payments & Compliance" },
  ];

  const size = compact ? "text-[11px]" : "text-xs";
  const pad = compact ? "py-2.5" : "py-4";

  return (
    <footer className="border-t border-border/60 bg-card/30">
      <div className={`max-w-5xl mx-auto px-4 lg:px-8 ${pad}`}>
        {/* Trust badges — centered, small */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <StripeBadge showText={false} />
          <NortonBadge />
        </div>

        {/* Copyright */}
        <p className={`${size} text-muted-foreground/70 text-center mb-1.5 leading-none`}>
          © {new Date().getFullYear()} Blockwork
        </p>

        {/* Legal links — single row on desktop, wraps on mobile */}
        <nav className={`flex flex-wrap items-center justify-center gap-x-1 gap-y-0 ${size} text-muted-foreground`}>
          {links.map((l, i) => (
            <React.Fragment key={l.to}>
              <Link
                to={l.to}
                className="min-h-[44px] inline-flex items-center px-1.5 hover:text-foreground hover:underline underline-offset-2 transition-colors"
              >
                {l.label}
              </Link>
              {i < links.length - 1 && (
                <span className="text-border/50 select-none hidden sm:inline">·</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>
    </footer>
  );
}