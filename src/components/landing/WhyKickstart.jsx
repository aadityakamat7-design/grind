import React from "react";
import { motion } from "framer-motion";
import { Check, X, Zap } from "lucide-react";

const US = ["Local jobs", "Secure payments", "Built for teens", "Easy scheduling", "Verified users", "Mobile app"];
const THEM = ["Hard to find work", "Cash only", "No trust", "No scheduling"];

export default function WhyKickstart() {
  return (
    <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6 }}
        className="relative rounded-2xl p-[1px] bg-gradient-to-b from-sky-400/60 via-blue-600/40 to-transparent"
      >
        <div className="rounded-2xl bg-slate-900/95 p-6 h-full">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-extrabold text-white text-lg">KickStart</h3>
          </div>
          <ul className="space-y-3">
            {US.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm font-semibold text-slate-200">
                <span className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-emerald-400" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="rounded-2xl bg-white/[0.03] border border-white/10 p-6"
      >
        <h3 className="font-extrabold text-slate-400 text-lg mb-5">Other options</h3>
        <ul className="space-y-3">
          {THEM.map((item) => (
            <li key={item} className="flex items-center gap-3 text-sm font-semibold text-slate-500">
              <span className="w-5 h-5 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <X className="w-3 h-3 text-rose-400/70" />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}