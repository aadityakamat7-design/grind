import React from "react";
import { Link } from "react-router-dom";
import { Zap, Instagram, Twitter, Facebook } from "lucide-react";

const COLS = [
  { title: "Product", links: ["About", "How it works", "Safety"] },
  { title: "Company", links: ["Contact", { label: "Support", to: "/support" }] },
  { title: "Legal", links: [{ label: "Privacy Policy", to: "/privacy" }, { label: "Terms of Service", to: "/terms" }] },
];

export default function LandingFooter() {
  return (
    <footer className="relative z-10 border-t border-border bg-card">
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
                <Zap className="w-4 h-4 text-background" />
              </div>
              <span className="font-bold text-lg text-foreground">KickStart</span>
            </div>
            <p className="text-sm text-muted-foreground mt-3 max-w-xs leading-relaxed">
              The safe way for neighborhood teens to turn skills into cash — parent-approved, every step.
            </p>
            <div className="flex gap-3 mt-5">
              {[Instagram, Twitter, Facebook].map((Icon, i) => (
                <a key={i} href="#" aria-label="Social link" className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={typeof l === "string" ? l : l.label}>
                    {typeof l === "string" ? (
                      <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l}</a>
                    ) : (
                      <Link to={l.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-12 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} KickStart. All rights reserved.</p>
          <Link to="/register" className="text-xs font-medium text-foreground hover:underline">Start earning →</Link>
        </div>
      </div>
    </footer>
  );
}