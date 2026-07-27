import React from "react";
import { motion } from "framer-motion";
import { Lock, HeartHandshake, Star, BadgeCheck, MessageSquare, ClipboardCheck } from "lucide-react";

const ITEMS = [
  { icon: Lock, title: "Secure Payments", desc: "Neighbors pay KickStart up front — we pay the teen once the job is done." },
  { icon: HeartHandshake, title: "Parent-Friendly", desc: "Parents verify their identity and approve every single booking." },
  { icon: Star, title: "Community Ratings", desc: "Two-way ratings keep every job honest, on both sides." },
  { icon: BadgeCheck, title: "Verified Profiles", desc: "Adults pass ID + selfie verification before hiring anyone." },
  { icon: MessageSquare, title: "Messaging", desc: "In-app chat with personal info masked until a booking is confirmed." },
  { icon: ClipboardCheck, title: "Job Reviews", desc: "Every listing is screened against state work rules for teens." },
];

export default function SafetyGrid() {
  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
      {ITEMS.map((item, i) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ delay: i * 0.06, duration: 0.5 }}
          className="rounded-2xl bg-card border border-border p-5 shadow-soft hover:shadow-card transition-shadow duration-300"
        >
          <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center mb-4">
            <item.icon className="w-5 h-5 text-foreground" />
          </div>
          <h3 className="font-semibold text-foreground">{item.title}</h3>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{item.desc}</p>
        </motion.div>
      ))}
    </div>
  );
}