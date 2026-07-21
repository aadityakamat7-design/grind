import React from "react";
import { motion } from "framer-motion";

const STATS = [
  { value: "12,000+", label: "Jobs completed" },
  { value: "$120", label: "Made in a weekend mowing lawns" },
  { value: "4.9★", label: "Average job rating" },
  { value: "100%", label: "Payments protected" },
];

export default function CommunityStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
      {STATS.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.06, duration: 0.5 }}
          className="rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-5 text-center backdrop-blur-sm"
        >
          <p className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">{s.value}</p>
          <p className="text-[11px] font-semibold text-slate-400 mt-1.5 leading-tight">{s.label}</p>
        </motion.div>
      ))}
    </div>
  );
}