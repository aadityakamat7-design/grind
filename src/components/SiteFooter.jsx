import React from "react";
import { Link } from "react-router-dom";
import { Instagram } from "lucide-react";
import StripeBadge from "@/components/StripeBadge";
import SSLBadge from "@/components/SSLBadge";

// Dense, multi-column link grid footer — Robinhood-style density in
// Blockwork's own visual system. Small text, grouped columns, trust
// badges + copyright anchored at the bottom.
const COLUMNS = [
  {
    header: "Company",
    links: [
      { to: "/how-it-works", label: "How it works" },
      { to: "/about", label: "About" },
      { to: "/support", label: "Contact / Support" },
    ],
  },
  {
    header: "Guides",
    links: [
      { to: "/parent-guide", label: "Parent Guide" },
      { to: "/neighbor-guide", label: "Neighbor Guide" },
      { to: "/pricing", label: "Pricing" },
      { to: "/refunds", label: "Refunds & Disputes" },
    ],
  },
  {
    header: "Legal & Safety",
    links: [
      { to: "/terms", label: "Terms of Service" },
      { to: "/privacy", label: "Privacy Policy" },
      { to: "/safety", label: "Safety Center" },
      { to: "/report-safety", label: "Report a Safety Concern" },
    ],
  },
];

export default function SiteFooter({ compact = false, hideBadgesOnMobile = false }) {
  const size = compact ? "text-[11px]" : "text-xs";
  const pad = compact ? "py-3" : "py-6";

  return (
    <footer className="border-t border-border/60 bg-card/30">
      <div className={`max-w-5xl mx-auto px-4 lg:px-8 ${pad}`}>
        {/* Link grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 mb-5">
          {COLUMNS.map((col) => (
            <div key={col.header}>
              <p className={`${size} font-semibold text-foreground/80 uppercase tracking-wider mb-2`}>
                {col.header}
              </p>
              <ul className="space-y-1">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className={`${size} text-muted-foreground hover:text-foreground hover:underline underline-offset-2 transition-colors inline-block min-h-[20px]`}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Trust badges + copyright */}
        <div className={`flex flex-col items-center gap-2 pt-4 border-t border-border/40 ${hideBadgesOnMobile ? "lg:flex hidden" : ""}`}>
          <div className="flex items-center gap-3">
            <StripeBadge showText={false} />
            <SSLBadge />
            <a
              href="https://www.instagram.com/blockworkjobsforteens/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Blockwork on Instagram"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Instagram className="w-5 h-5" />
            </a>
          </div>
          <p className={`${size} text-muted-foreground/70 text-center leading-none`}>
            © {new Date().getFullYear()} Blockwork
          </p>
        </div>
      </div>
    </footer>
  );
}