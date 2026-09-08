import React from "react";
import { Link } from "react-router-dom";
import { Lock, Mail, Clock, MapPin } from "lucide-react";
import StripeBadge from "@/components/StripeBadge";
import NortonBadge from "@/components/NortonBadge";

// Site-wide footer with visible contact information, service area, trust
// badges, and legal links — the trust signals automated reputation checkers
// and skeptical users look for. Appears on every page.
export default function SiteFooter() {
  const links = [
    { to: "/about", label: "About" },
    { to: "/terms", label: "Terms" },
    { to: "/privacy", label: "Privacy" },
    { to: "/support", label: "Support" },
    { to: "/safety", label: "Safety" },
    { to: "/compliance", label: "Payments & Compliance" },
  ];
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-5">
        {/* Contact + identity */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <Link to="/" className="font-semibold text-foreground hover:text-primary transition-colors">
              Blockwork
            </Link>
            <span className="text-border">·</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
            <a href="mailto:support@blockwork.online" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
              <Mail className="w-3 h-3" /> support@blockwork.online
            </a>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> We respond within 24 hours
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Serving California
            </span>
          </div>
        </div>

        {/* Legal links */}
        <nav className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px] text-muted-foreground mb-4">
          {links.map((l, i) => (
            <React.Fragment key={l.to}>
              {i > 0 && <span className="hidden sm:inline text-border/60">·</span>}
              <Link to={l.to} className="hover:text-foreground transition-colors min-h-[28px] inline-flex items-center">
                {l.label}
              </Link>
            </React.Fragment>
          ))}
        </nav>

        {/* Trust badges + payment reassurance */}
        <div className="flex flex-col items-center gap-2 pt-3 border-t border-border/50">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <StripeBadge showText={false} />
            <NortonBadge />
            <span className="inline-flex items-center gap-1 rounded-md bg-secondary border border-border px-2 py-1 text-[10px] font-semibold text-muted-foreground leading-none whitespace-nowrap">
              <Lock className="w-3 h-3" /> SSL Secured
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground text-center leading-tight max-w-md">
            Payments processed by Stripe. We never store card or bank details.
          </p>
          <p className="text-[10px] text-muted-foreground/70 text-center">
            Blockwork is built and operated by a small team in California.
          </p>
        </div>
      </div>
    </footer>
  );
}