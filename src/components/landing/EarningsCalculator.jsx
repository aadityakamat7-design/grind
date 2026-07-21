import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";

const SERVICES = [
  { label: "Lawn mowing", emoji: "🌿", price: 40 },
  { label: "Dog walking", emoji: "🐕", price: 25 },
  { label: "Tutoring", emoji: "📚", price: 30 },
  { label: "Babysitting", emoji: "🧸", price: 45 },
];

function useCountUp(target) {
  const [value, setValue] = useState(target);
  const raf = useRef();
  useEffect(() => {
    const start = value;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min((t - t0) / 500, 1);
      setValue(Math.round(start + (target - start) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return value;
}

export default function EarningsCalculator() {
  const [service, setService] = useState(SERVICES[0]);
  const [jobsPerWeek, setJobsPerWeek] = useState(3);
  const monthly = service.price * jobsPerWeek * 4;
  const animated = useCountUp(monthly);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6 }}
      className="max-w-xl mx-auto rounded-2xl bg-slate-900/80 border border-white/10 p-6 sm:p-8 backdrop-blur-sm shadow-2xl shadow-black/30"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SERVICES.map((s) => (
          <button
            key={s.label}
            onClick={() => setService(s)}
            className={`rounded-xl border px-2 py-3 text-center transition-colors ${
              service.label === s.label
                ? "bg-blue-600/20 border-sky-500/50 text-white"
                : "bg-white/[0.03] border-white/10 text-slate-400 hover:border-white/25"
            }`}
          >
            <span className="block text-lg">{s.emoji}</span>
            <span className="block text-[10px] font-bold mt-1">{s.label}</span>
            <span className="block text-[10px] text-sky-400 font-extrabold">${s.price}/job</span>
          </button>
        ))}
      </div>

      <div className="mt-7">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-slate-300">Jobs per week</span>
          <span className="text-sm font-extrabold text-white">{jobsPerWeek}</span>
        </div>
        <Slider value={[jobsPerWeek]} min={1} max={10} step={1} onValueChange={(v) => setJobsPerWeek(v[0])} />
      </div>

      <div className="mt-8 rounded-2xl bg-gradient-to-br from-blue-600/20 to-sky-500/10 border border-sky-500/20 p-6 text-center">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monthly earnings</p>
        <p className="text-5xl font-extrabold text-white mt-2 tabular-nums">
          <span className="text-sky-400">≈</span> ${animated.toLocaleString()}
        </p>
        <p className="text-xs text-slate-500 mt-2">{jobsPerWeek} × {service.label.toLowerCase()} at ${service.price} each, 4 weeks</p>
      </div>
    </motion.div>
  );
}