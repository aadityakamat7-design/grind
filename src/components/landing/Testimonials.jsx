import React from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { Image } from "@/components/ui/image";

const ITEMS = [
  {
    quote: "My son mows four lawns every weekend now. I approve each booking from my phone and the money lands in our account — it couldn't be easier.",
    name: "Melissa T.",
    area: "Oakwood Estates · Parent",
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80",
    stars: 5,
  },
  {
    quote: "I made $310 last month tutoring two kids on my street. Way better than waiting until I'm 16 for a real job.",
    name: "Jordan P.",
    area: "Maple Heights · Teen, 15",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80",
    stars: 5,
  },
  {
    quote: "Finding a reliable dog walker used to be impossible. Now a verified teen two doors down walks Biscuit every weekday.",
    name: "Raj S.",
    area: "Cedar Park · Neighbor",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80",
    stars: 5,
  },
];

export default function Testimonials() {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {ITEMS.map((t, i) => (
        <motion.div
          key={t.name}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ delay: i * 0.1, duration: 0.5 }}
          className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 backdrop-blur-sm flex flex-col"
        >
          <div className="flex gap-0.5 mb-4">
            {Array.from({ length: t.stars }).map((_, s) => (
              <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <p className="text-sm text-slate-300 leading-relaxed flex-1">"{t.quote}"</p>
          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-white/5">
            <Image src={t.photo} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
            <div>
              <p className="text-sm font-bold text-white">{t.name}</p>
              <p className="text-[11px] text-slate-500">{t.area}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}