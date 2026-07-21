import React from "react";
import { motion } from "framer-motion";

const SERVICES = [
  { emoji: "🌿", label: "Lawn Care" },
  { emoji: "🐕", label: "Dog Walking" },
  { emoji: "❄️", label: "Snow Shoveling" },
  { emoji: "📚", label: "Tutoring" },
  { emoji: "🚗", label: "Car Washing" },
  { emoji: "🧸", label: "Babysitting" },
  { emoji: "💻", label: "Tech Help" },
  { emoji: "🛋️", label: "Furniture Moving" },
  { emoji: "🧹", label: "House Cleaning" },
  { emoji: "🛒", label: "Grocery Pickup" },
];

export default function ServicesGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {SERVICES.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, scale: 0.94 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.04, duration: 0.4 }}
          whileHover={{ y: -4 }}
          className="rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/10 p-4 text-center backdrop-blur-sm cursor-default"
        >
          <span className="text-2xl block mb-2">{s.emoji}</span>
          <span className="text-xs font-bold text-slate-200">{s.label}</span>
        </motion.div>
      ))}
    </div>
  );
}