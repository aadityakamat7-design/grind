import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, BadgeCheck, Wallet, MapPin } from "lucide-react";

const POINTS = [
  { icon: ShieldCheck, title: "Parent-approved", desc: "Every booking is approved by a parent before it's confirmed." },
  { icon: BadgeCheck, title: "ID-verified neighbors", desc: "Every adult on Kickstart verifies their identity first." },
  { icon: Wallet, title: "Payments held safely", desc: "Money sits in escrow until the job is done — no surprises." },
  { icon: MapPin, title: "Hyperlocal", desc: "Your own neighborhood only. Real neighbors, close to home." },
];

export default function TrustPoints() {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {POINTS.map((p, i) => (
        <motion.div
          key={p.title}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: i * 0.08 }}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
        >
          <div className="w-11 h-11 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
            <p.icon className="w-6 h-6 text-sky-400" />
          </div>
          <h3 className="font-bold text-white text-lg">{p.title}</h3>
          <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">{p.desc}</p>
        </motion.div>
      ))}
    </div>
  );
}