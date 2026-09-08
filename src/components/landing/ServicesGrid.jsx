import React from "react";
import { motion } from "framer-motion";

// Every service card is identical (emoji + label, same style) — no "different
// things." All cards are the same size and fit on a single row on desktop.
// Outdoor jobs + online services only — no indoor/in-home work.
const SERVICES = [
  { emoji: "🌿", label: "Lawn Care" },
  { emoji: "🐕", label: "Dog Walking" },
  { emoji: "🪟", label: "Window Cleaning" },
  { emoji: "🚗", label: "Car Washing" },
  { emoji: "🛒", label: "Grocery Pickup" },
  { emoji: "📚", label: "Tutoring" },
  { emoji: "💻", label: "Tech Help" },
];

export default function ServicesGrid() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
      {SERVICES.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, scale: 0.94 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.03, duration: 0.35 }}
          whileHover={{ y: -3 }}
          className="rounded-2xl bg-card border border-border p-5 text-center shadow-soft cursor-default flex flex-col items-center justify-center gap-2"
        >
          <span className="text-2xl">{s.emoji}</span>
          <span className="text-sm font-medium text-foreground">{s.label}</span>
        </motion.div>
      ))}
    </div>
  );
}