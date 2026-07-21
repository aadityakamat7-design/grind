import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, BadgeCheck, Lock, MapPin, Users } from "lucide-react";

const ITEMS = [
  { icon: ShieldCheck, label: "Safe community" },
  { icon: BadgeCheck, label: "Verified users" },
  { icon: Lock, label: "Secure payments" },
  { icon: MapPin, label: "Local opportunities" },
  { icon: Users, label: "Built for teens & neighbors" },
];

export default function TrustBar() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {ITEMS.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.06, duration: 0.5 }}
          className="flex flex-col items-center gap-2.5 rounded-2xl bg-white/[0.04] border border-white/10 px-3 py-5 text-center backdrop-blur-sm"
        >
          <item.icon className="w-5 h-5 text-sky-400" />
          <span className="text-xs font-semibold text-slate-300 leading-tight">{item.label}</span>
        </motion.div>
      ))}
    </div>
  );
}