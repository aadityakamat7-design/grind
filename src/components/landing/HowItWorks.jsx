import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Search, Lock } from "lucide-react";

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

function BrowseMock() {
  return (
    <div className="rounded-xl bg-slate-950/70 border border-white/10 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
        <Search className="w-3 h-3" /> Teens near 30327
      </div>
      {[["Jordan P.", "Lawn care", "4.9"], ["Ava R.", "Tutoring", "5.0"]].map(([n, s, r]) => (
        <div key={n} className="flex items-center justify-between rounded-lg bg-white/5 px-2 py-1.5">
          <div>
            <span className="text-[10px] font-bold text-white">{n}</span>
            <span className="text-[9px] text-slate-400 ml-1.5">{s}</span>
          </div>
          <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-400">
            <Star className="w-2.5 h-2.5 fill-amber-400" /> {r}
          </span>
        </div>
      ))}
    </div>
  );
}

function ChooseMock() {
  return (
    <div className="rounded-xl bg-slate-950/70 border border-white/10 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-xs font-extrabold">J</div>
        <div>
          <div className="text-[11px] font-bold text-white">Jordan P. <span className="text-[9px] text-emerald-400">✓ Verified</span></div>
          <div className="flex items-center gap-0.5 text-[9px] text-amber-400 font-bold">
            <Star className="w-2.5 h-2.5 fill-amber-400" /> 4.9 · 32 jobs
          </div>
        </div>
      </div>
      <div className="rounded-lg bg-blue-600/25 border border-sky-500/30 px-2 py-1.5 text-center text-[10px] font-bold text-sky-300">Book for Saturday</div>
    </div>
  );
}

function PaySecureMock() {
  return (
    <div className="rounded-xl bg-slate-950/70 border border-white/10 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
        <Lock className="w-3 h-3 text-sky-400" /> Paid to KickStart — held securely
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-white">Lawn mowing</span>
        <span className="text-[11px] font-extrabold text-white">$40.00</span>
      </div>
      <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2 py-1.5 text-center text-[10px] font-bold text-emerald-300">
        Job done → teen paid ✓
      </div>
    </div>
  );
}

const FLOWS = {
  teen: [
    { n: "1", title: "Create Your Profile", desc: "Add your skills and availability — a parent approves the account.", Mock: ProfileMock },
    { n: "2", title: "Get Hired", desc: "Neighbors browse your profile or post jobs right in your area.", Mock: HiredMock },
    { n: "3", title: "Get Paid", desc: "Finish the job and KickStart pays you — automatically, no chasing.", Mock: PaidMock },
  ],
  neighbor: [
    { n: "1", title: "Browse Local Teens", desc: "See verified teens in your neighborhood, filtered by service.", Mock: BrowseMock },
    { n: "2", title: "Choose & Book", desc: "Pick based on ratings, skills, and reviews from real neighbors.", Mock: ChooseMock },
    { n: "3", title: "Pay Securely", desc: "You pay KickStart up front — we pay the teen once the job is done.", Mock: PaySecureMock },
  ],
};

export default function HowItWorks() {
  const [tab, setTab] = useState("teen");
  return (
    <div>
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-xl bg-white/[0.05] border border-white/10 p-1 backdrop-blur-sm">
          {[["teen", "I'm a teen"], ["neighbor", "I'm a neighbor"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-colors ${
                tab === key ? "bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-lg shadow-blue-500/25" : "text-slate-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="grid md:grid-cols-3 gap-5"
        >
          {FLOWS[tab].map((s) => (
            <div key={s.title} className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 backdrop-blur-sm hover:border-white/20 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center text-sm font-extrabold text-white">{s.n}</span>
                <h3 className="font-bold text-white text-lg">{s.title}</h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-5">{s.desc}</p>
              <s.Mock />
            </div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}