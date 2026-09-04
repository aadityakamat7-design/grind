import React from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import StripeBadge from "@/components/StripeBadge";
import NortonBadge from "@/components/NortonBadge";

// Subtle site-wide footer with the five required links. Appears on every page.
export default function SiteFooter() {
  const links = [
    { to: "/terms", label: "Terms of Service" },
    { to: "/privacy", label: "Privacy Policy" },
    { to: "/compliance", label: "Payments & Compliance" },
    { to: "/support", label: "Support" },
    { to: "/safety", label: "Safety" },
    { to: "/faq", label: "FAQ" },
    { to: "/how-it-works", label: "How it works" },
    { to: "/about", label: "About" },
  ];
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/" className="font-semibold text-foreground hover:text-primary transition-colors">
              Blockwork
            </Link>
            <span>· © {new Date().getFullYear()}</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className="hover:text-foreground transition-colors">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        {/* Trust badges + self-stated security indicators — site-wide */}
        <div className="flex flex-col items-center gap-3 mt-4 pt-4 border-t border-border/50">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <StripeBadge showText={false} />
            <NortonBadge />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Lock className="w-3 h-3" /> SSL Secured
            </span>
            <span className="inline-flex items-center gap-1">
              Payments processed by Stripe
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}