import React from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

function ProfileMock() {
  return (
    <div className="rounded-xl bg-slate-950/70 border border-white/10 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-xs font-extrabold">A</div>
        <div>
          <div className="text-[11px] font-bold text-white">Ava R.</div>
          <div className="text-[9px] text-slate-400">Tutoring · Pet sitting</div>
        </div>
      </div>
      <div className="flex gap-1.5">
        {["Math", "Dogs", "Weekends"].map((t) => (
          <span key={t} className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-semibold text-slate-300">{t}</span>
        ))}
      </div>
    </div>
  );
}

function HiredMock() {
  return (
    <div className="rounded-xl bg-slate-950/70 border border-white/10 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-white">Lawn mowing</span>
        <span className="text-[11px] font-extrabold text-emerald-400">$40</span>
      </div>
      <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2 py-1.5 text-center text-[10px] font-bold text-emerald-300">
        Booking confirmed ✓
      </div>
    </div>
  );
}

function PaidMock() {
  return (
    <div className="rounded-xl bg-slate-950/70 border border-white/10 p-3 space-y-2">
      <div className="text-[9px] text-slate-400">Wallet balance</div>
      <div className="text-lg font-extrabold text-white">$262.50</div>
      <div className="flex items-center gap-1 text-[10px] text-slate-300">
        <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> New 5-star review
      </div>
    </div>
  );
}

const STEPS = [
  { n: "1", title: "Create Your Profile", desc: "Add your skills and availability — a parent approves the account.", Mock: ProfileMock },
  { n: "2", title: "Get Hired", desc: "Neighbors browse your profile or post jobs right in your area.", Mock: HiredMock },
  { n: "3", title: "Get Paid", desc: "Complete the work and receive secure payments through KickStart.", Mock: PaidMock },
];

export default function HowItWorks() {
  return (
    <div className="grid md:grid-cols-3 gap-5">
      {STEPS.map((s, i) => (
        <motion.div
          key={s.n}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ delay: i * 0.1, duration: 0.6 }}
          className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 backdrop-blur-sm hover:border-white/20 transition-colors"
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center text-sm font-extrabold text-white">{s.n}</span>
            <h3 className="font-bold text-white text-lg">{s.title}</h3>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed mb-5">{s.desc}</p>
          <s.Mock />
        </motion.div>
      ))}
    </div>
  );
}