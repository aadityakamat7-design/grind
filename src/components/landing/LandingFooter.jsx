import React from "react";
import { Link } from "react-router-dom";
import { Zap, Instagram, Twitter, Facebook } from "lucide-react";

const COLS = [
  { title: "Product", links: ["About", "How it works", "Safety"] },
  { title: "Company", links: ["Contact", "Support"] },
  { title: "Legal", links: ["Privacy Policy", "Terms of Service"] },
];

export default function LandingFooter() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-slate-950/80 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-lg text-white">KickStart</span>
            </div>
            <p className="text-sm text-slate-500 mt-3 max-w-xs leading-relaxed">
              The safe way for neighborhood teens to turn skills into cash — parent-approved, every step.
            </p>
            <div className="flex gap-3 mt-5">
              {[Instagram, Twitter, Facebook].map((Icon, i) => (
                <a key={i} href="#" aria-label="Social link" className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/25 transition-colors">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-slate-500 hover:text-white transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-12 pt-6 border-t border-white/5">
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} KickStart. All rights reserved.</p>
          <Link to="/register" className="text-xs font-bold text-sky-400 hover:text-sky-300">Start earning →</Link>
        </div>
      </div>
    </footer>
  );
}