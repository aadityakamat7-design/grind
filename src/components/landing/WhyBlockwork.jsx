import React from "react";
import { motion } from "framer-motion";
import { Check, X, Zap } from "lucide-react";

const US = ["Local jobs", "Secure payments", "Built for teens", "Easy scheduling", "Verified users", "Mobile app"];
const THEM = ["Hard to find work", "Cash only", "No trust", "No scheduling"];

export default function WhyBlockwork() {
  return (
    <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6 }}
        className="rounded-2xl bg-card p-6 shadow-elevated"
      >
        <div className="flex items-center gap-2 mb-5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <h3 className="font-bold text-foreground text-lg">Blockwork</h3>
        </div>
        <ul className="space-y-3">
          {US.map((item) => (
            <li key={item} className="flex items-center gap-3 text-sm font-medium text-foreground/90">
              <span className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-primary" />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="rounded-2xl bg-muted border border-border p-6"
      >
        <h3 className="font-semibold text-muted-foreground text-lg mb-5">Other options</h3>
        <ul className="space-y-3">
          {THEM.map((item) => (
            <li key={item} className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
              <span className="w-5 h-5 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0">
                <X className="w-3 h-3 text-muted-foreground" />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}