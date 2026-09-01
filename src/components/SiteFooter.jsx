import React from "react";
import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

// Subtle site-wide footer with the five required links. Appears on every page.
export default function SiteFooter() {
  const links = [
    { to: "/terms", label: "Terms of Service" },
    { to: "/privacy", label: "Privacy Policy" },
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
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Blockwork</span>
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
      </div>
    </footer>
  );
}