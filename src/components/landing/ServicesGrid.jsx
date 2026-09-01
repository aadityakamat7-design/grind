import React from "react";
import { motion } from "framer-motion";

// Two featured services get full cards with a one-line pitch.
// The rest flow as organic pill chips — varied widths, natural wrap —
// so the section reads editorial rather than a stamped 10-tile grid.
const FEATURED = [
  { emoji: "🌿", label: "Lawn Care", pitch: "Mowing, edging, leaf cleanup — the neighborhood classic." },
  { emoji: "📚", label: "Tutoring", pitch: "Math, reading, test prep — online or on the porch." },
];

const REST = [
  { emoji: "🐕", label: "Dog Walking" },
  { emoji: "🚗", label: "Car Washing" },
  { emoji: "❄️", label: "Snow Shoveling" },
  { emoji: "💻", label: "Tech Help" },
  { emoji: "🧸", label: "Babysitting" },
  { emoji: "🛋️", label: "Furniture Moving" },
  { emoji: "🧹", label: "House Cleaning" },
  { emoji: "🛒", label: "Grocery Pickup" },
];

export default function ServicesGrid() {
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        {FEATURED.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: i * 0.08 }}
            className="rounded-2xl bg-card border border-border p-6 shadow-card flex items-start gap-4"
          >
            <span className="text-3xl leading-none mt-0.5">{s.emoji}</span>
            <div>
              <h3 className="font-semibold text-foreground text-base">{s.label}</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{s.pitch}</p>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2.5">
        {REST.map((s, i) => (
          <motion.span
            key={s.label}
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.03, duration: 0.3 }}
            className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-4 py-2.5 text-sm font-medium text-foreground shadow-soft"
          >
            <span className="text-base">{s.emoji}</span>
            {s.label}
          </motion.span>
        ))}
      </div>
    </div>
  );
}