import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Search, Lock } from "lucide-react";

function ProfileMock() {
  return (
    <div className="rounded-xl bg-muted border border-border p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">A</div>
        <div>
          <div className="text-[11px] font-semibold text-foreground">Ava R.</div>
          <div className="text-[9px] text-muted-foreground">Tutoring · Pet sitting</div>
        </div>
      </div>
      <div className="flex gap-1.5">
        {["Math", "Dogs", "Weekends"].map((t) => (
          <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-[9px] font-medium text-muted-foreground">{t}</span>
        ))}
      </div>
    </div>
  );
}

function HiredMock() {
  return (
    <div className="rounded-xl bg-muted border border-border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-foreground">Lawn mowing</span>
        <span className="text-[11px] font-bold text-foreground">$40</span>
      </div>
      <div className="rounded-lg bg-primary px-2 py-1.5 text-center text-[10px] font-medium text-primary-foreground">
        Booking confirmed ✓
      </div>
    </div>
  );
}

function PaidMock() {
  return (
    <div className="rounded-xl bg-muted border border-border p-3 space-y-2">
      <div className="text-[9px] text-muted-foreground">Wallet balance</div>
      <div className="text-lg font-bold text-foreground">$262.50</div>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Star className="w-3 h-3 fill-foreground text-foreground" /> New 5-star review
      </div>
    </div>
  );
}

function BrowseMock() {
  return (
    <div className="rounded-xl bg-muted border border-border p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
        <Search className="w-3 h-3" /> Teens near 30327
      </div>
      {[["Jordan P.", "Lawn care", "4.9"], ["Ava R.", "Tutoring", "5.0"]].map(([n, s, r]) => (
        <div key={n} className="flex items-center justify-between rounded-lg bg-card border border-border px-2 py-1.5">
          <div>
            <span className="text-[10px] font-semibold text-foreground">{n}</span>
            <span className="text-[9px] text-muted-foreground ml-1.5">{s}</span>
          </div>
          <span className="flex items-center gap-0.5 text-[9px] font-semibold text-foreground">
            <Star className="w-2.5 h-2.5 fill-foreground" /> {r}
          </span>
        </div>
      ))}
    </div>
  );
}

function ChooseMock() {
  return (
    <div className="rounded-xl bg-muted border border-border p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">J</div>
        <div>
          <div className="text-[11px] font-semibold text-foreground">Jordan P. <span className="text-[9px] text-muted-foreground">✓ Verified</span></div>
          <div className="flex items-center gap-0.5 text-[9px] font-semibold text-foreground">
            <Star className="w-2.5 h-2.5 fill-foreground" /> 4.9 · 32 jobs
          </div>
        </div>
      </div>
      <div className="rounded-lg bg-primary px-2 py-1.5 text-center text-[10px] font-medium text-primary-foreground">Book for Saturday</div>
    </div>
  );
}

function PaySecureMock() {
  return (
    <div className="rounded-xl bg-muted border border-border p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
        <Lock className="w-3 h-3" /> Paid to Blockwork — held securely
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-foreground">Lawn mowing</span>
        <span className="text-[11px] font-bold text-foreground">$40.00</span>
      </div>
      <div className="rounded-lg bg-primary px-2 py-1.5 text-center text-[10px] font-medium text-primary-foreground">
        Job done → teen paid ✓
      </div>
    </div>
  );
}

const FLOWS = {
  teen: [
    { n: "1", title: "Create Your Profile", desc: "Add your skills and availability — a parent approves the account.", Mock: ProfileMock },
    { n: "2", title: "Get Hired", desc: "Neighbors browse your profile or post jobs right in your area.", Mock: HiredMock },
    { n: "3", title: "Get Paid", desc: "Finish the job and Blockwork pays you — automatically, no chasing.", Mock: PaidMock },
  ],
  neighbor: [
    { n: "1", title: "Browse Local Teens", desc: "See verified teens in your neighborhood, filtered by service.", Mock: BrowseMock },
    { n: "2", title: "Choose & Book", desc: "Pick based on ratings, skills, and reviews from real neighbors.", Mock: ChooseMock },
    { n: "3", title: "Pay Securely", desc: "You pay Blockwork up front — we pay the teen once the job is done.", Mock: PaySecureMock },
  ],
};

export default function HowItWorks() {
  const [tab, setTab] = useState("teen");
  return (
    <div>
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-xl bg-muted border border-border p-1">
          {[["teen", "I'm a teen"], ["neighbor", "I'm a neighbor"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                tab === key ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
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
            <div key={s.title} className="rounded-2xl bg-card border border-border p-6 shadow-card hover:shadow-elevated transition-shadow duration-300">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground">{s.n}</span>
                <h3 className="font-semibold text-foreground text-lg">{s.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">{s.desc}</p>
              <s.Mock />
            </div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}