import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Check, X, ShieldCheck, ArrowRight } from "lucide-react";

// Compact, scannable safety summary for the landing page — covers the five
// core protections plus a "what we don't do" anti-scam list, with a link to
// the full Payments & Compliance page.
const DO = [
  "Parent approval on every job",
  "Verified ages and identity",
  "Payments held in escrow until work is confirmed",
  "No home entry — outdoor work and online tutoring only",
  "Card and bank details handled entirely by Stripe",
];

const DONT = [
  "We never ask for payment to sign up or get work",
  "We never ask for your Social Security number — Stripe collects that directly",
  "We never store card or bank details",
  "Teens never enter a client's home",
];

export default function SafetySummary() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto rounded-2xl bg-card border border-border shadow-card overflow-hidden"
    >
      <div className="grid md:grid-cols-2">
        {/* What we do */}
        <div className="p-6 md:p-7 md:border-r border-b md:border-b-0 border-border">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-success" />
            <h3 className="font-semibold text-foreground">What we do</h3>
          </div>
          <ul className="space-y-2.5">
            {DO.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/90">
                <span className="w-5 h-5 rounded-full bg-success/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-success" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        {/* What we don't do */}
        <div className="p-6 md:p-7 bg-secondary/50">
          <div className="flex items-center gap-2 mb-4">
            <X className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">What we don't do</h3>
          </div>
          <ul className="space-y-2.5">
            {DONT.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/90">
                <span className="w-5 h-5 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                  <X className="w-3 h-3 text-destructive" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="px-6 md:px-7 py-4 border-t border-border bg-card flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Want the full breakdown of how payments and compliance work?
        </p>
        <Link to="/compliance" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0 whitespace-nowrap">
          Payments & Compliance <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </motion.div>
  );
}