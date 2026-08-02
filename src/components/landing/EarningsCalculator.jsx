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
      className="max-w-xl mx-auto rounded-2xl bg-card border border-border p-6 sm:p-8 shadow-elevated"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SERVICES.map((s) => (
          <button
            key={s.label}
            onClick={() => setService(s)}
            className={`rounded-xl border px-2 py-3 text-center transition-all duration-200 ${
              service.label === s.label
                ? "bg-primary border-primary text-primary-foreground"
                : "bg-muted border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            <span className="block text-lg">{s.emoji}</span>
            <span className="block text-[10px] font-medium mt-1">{s.label}</span>
            <span className="block text-[10px] font-bold">${s.price}/job</span>
          </button>
        ))}
      </div>

      <div className="mt-7">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-muted-foreground">Jobs per week</span>
          <span className="text-sm font-bold text-foreground">{jobsPerWeek}</span>
        </div>
        <Slider value={[jobsPerWeek]} min={1} max={10} step={1} onValueChange={(v) => setJobsPerWeek(v[0])} />
      </div>

      <div className="mt-8 rounded-2xl bg-muted border border-border p-6 text-center">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Monthly earnings</p>
        <p className="text-5xl font-bold text-foreground mt-2 tabular-nums">
          ${animated.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground mt-2">{jobsPerWeek} × {service.label.toLowerCase()} at ${service.price} each, 4 weeks</p>
      </div>
    </motion.div>
  );
}