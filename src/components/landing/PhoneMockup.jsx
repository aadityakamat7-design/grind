import React from "react";
import { motion } from "framer-motion";
import { Star, ShieldCheck, Wallet } from "lucide-react";

const JOBS = [
  { title: "Lawn mowing", price: "$40", meta: "0.4 mi · Sat 10am", emoji: "🌿" },
  { title: "Dog walking", price: "$25", meta: "Recurring · weekdays", emoji: "🐕" },
  { title: "Math tutoring", price: "$30/hr", meta: "Tonight · 6pm", emoji: "📐" },
];

export default function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[280px] sm:w-[300px]">
      {/* Phone frame */}
      <div className="relative rounded-[2.6rem] border border-white/15 bg-slate-900/90 backdrop-blur p-2.5 shadow-2xl shadow-blue-950/60">
        <div className="rounded-[2rem] bg-gradient-to-b from-slate-950 to-slate-900 overflow-hidden">
          <div className="h-7 flex justify-center items-end pb-1">
            <div className="w-20 h-4 rounded-full bg-black" />
          </div>
          <div className="px-4 pt-2 pb-6">
            <p className="text-[11px] font-bold text-slate-400">Nearby jobs</p>
            <p className="text-lg font-extrabold text-white">Maple Heights</p>
            <div className="mt-3 space-y-2.5">
              {JOBS.map((j, i) => (
                <motion.div
                  key={j.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.15, duration: 0.5 }}
                  className="flex items-center gap-3 rounded-xl bg-white/[0.06] border border-white/10 p-3"
                >
                  <span className="text-xl">{j.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{j.title}</p>
                    <p className="text-[10px] text-slate-400">{j.meta}</p>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-400">{j.price}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating glass cards */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="absolute -left-16 top-40 hidden sm:flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 px-3 py-2 shadow-lg"
      >
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span className="text-[11px] font-bold text-white">Parent approved</span>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute -right-14 top-20 hidden sm:flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 px-3 py-2 shadow-lg"
      >
        <Wallet className="w-4 h-4 text-sky-400" />
        <div>
          <p className="text-[10px] text-slate-300 leading-none">Paid securely</p>
          <p className="text-xs font-extrabold text-white">+$40.00</p>
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="absolute -left-10 bottom-14 hidden sm:flex items-center gap-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 px-3 py-2 shadow-lg"
      >
        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
        <span className="text-[11px] font-bold text-white">4.9 · 32 reviews</span>
      </motion.div>
    </div>
  );
}