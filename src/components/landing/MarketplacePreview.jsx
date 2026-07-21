import React from "react";
import { motion } from "framer-motion";
import { MapPin, Clock, Repeat, Star } from "lucide-react";

const JOBS = [
  {
    emoji: "🌿",
    title: "Need lawn mowed",
    price: "$40",
    meta: [{ icon: MapPin, text: "2 miles away" }],
    stars: 5,
    poster: "Dana M.",
  },
  {
    emoji: "📐",
    title: "Math tutoring",
    price: "$30/hour",
    meta: [{ icon: Clock, text: "Tonight" }],
    stars: 5,
    poster: "Priya S.",
  },
  {
    emoji: "🐕",
    title: "Dog walking",
    price: "$25",
    meta: [{ icon: Repeat, text: "Recurring" }],
    stars: 4,
    poster: "Tom K.",
  },
];

export default function MarketplacePreview() {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {JOBS.map((j, i) => (
        <motion.div
          key={j.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ delay: i * 0.1, duration: 0.5 }}
          className="rounded-2xl bg-slate-900/80 border border-white/10 p-5 backdrop-blur-sm shadow-xl shadow-black/20 hover:border-sky-500/30 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-lg">{j.emoji}</span>
              <div>
                <p className="font-bold text-white text-sm">{j.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Posted by {j.poster}</p>
              </div>
            </div>
            <span className="font-extrabold text-emerald-400 text-sm shrink-0">{j.price}</span>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
            {j.meta.map((m) => (
              <span key={m.text} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
                <m.icon className="w-3.5 h-3.5 text-sky-400" /> {m.text}
              </span>
            ))}
            <span className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, s) => (
                <Star key={s} className={`w-3 h-3 ${s < j.stars ? "fill-amber-400 text-amber-400" : "text-slate-700"}`} />
              ))}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}