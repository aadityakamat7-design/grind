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
    detail: "Front + back yard, biweekly. Teen brings their own mower.",
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

// Asymmetric layout: one featured job card (left, tall) paired with two
// compact job cards stacked on the right — instead of three identical tiles.
export default function MarketplacePreview() {
  const [featured, ...rest] = JOBS;
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl bg-card border border-border p-6 shadow-card hover:shadow-elevated transition-shadow duration-300 flex flex-col"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center text-xl">{featured.emoji}</span>
            <div>
              <p className="font-semibold text-foreground">{featured.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Posted by {featured.poster}</p>
            </div>
          </div>
          <span className="font-bold text-foreground text-lg shrink-0">{featured.price}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{featured.detail}</p>
        <div className="flex items-center justify-between mt-auto pt-5 border-t border-border">
          {featured.meta.map((m) => (
            <span key={m.text} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <m.icon className="w-3.5 h-3.5" /> {m.text}
            </span>
          ))}
          <span className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, s) => (
              <Star key={s} className={`w-3.5 h-3.5 ${s < featured.stars ? "fill-foreground text-foreground" : "text-border"}`} />
            ))}
          </span>
        </div>
      </motion.div>

      <div className="grid gap-4">
        {rest.map((j, i) => (
          <motion.div
            key={j.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: (i + 1) * 0.1 }}
            className="rounded-2xl bg-card border border-border p-5 shadow-card hover:shadow-elevated transition-shadow duration-300"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center text-lg">{j.emoji}</span>
                <div>
                  <p className="font-semibold text-foreground text-sm">{j.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Posted by {j.poster}</p>
                </div>
              </div>
              <span className="font-bold text-foreground text-sm shrink-0">{j.price}</span>
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
              {j.meta.map((m) => (
                <span key={m.text} className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <m.icon className="w-3.5 h-3.5" /> {m.text}
                </span>
              ))}
              <span className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className={`w-3 h-3 ${s < j.stars ? "fill-foreground text-foreground" : "text-border"}`} />
                ))}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}