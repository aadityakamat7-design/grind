import React from "react";
import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

const COLS = [
  { title: "Product", links: [
    { label: "About", href: "#why" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Safety", href: "#safety" },
  ]},
  { title: "Company", links: [
    { label: "Contact", href: "mailto:support@blockwork.online" },
    { label: "Support", to: "/support" },
  ]},
  { title: "Legal", links: [
    { label: "Privacy Policy", to: "/privacy" },
    { label: "Terms of Service", to: "/terms" },
  ]},
];

export default function LandingFooter() {
  return (
    <footer className="relative z-10 border-t border-border bg-card">
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg text-foreground">Blockwork</span>
            </div>
            <p className="text-sm text-muted-foreground mt-3 max-w-xs leading-relaxed">
              The safe way for neighborhood teens to turn skills into cash — parent-approved, every step.
            </p>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.to ? (
                      <Link to={l.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link>
                    ) : (
                      <a href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-12 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Blockwork. All rights reserved.</p>
          <Link to="/register" className="text-xs font-medium text-foreground hover:underline">Start earning →</Link>
        </div>
      </div>
    </footer>
  );
}