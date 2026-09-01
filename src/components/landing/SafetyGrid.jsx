import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Star, Lock, Home } from "lucide-react";

// Trust section — bento layout with varied card sizes, all on white.
// Parent-approved is the hero card (wide, serif headline). ID-verified is tall
// (row-span-2). Escrow + No-home-entry are standard.
export default function SafetyGrid() {
  return (
    <div className="grid md:grid-cols-3 gap-4 md:gap-5">
      {/* Parent-approved — large, wide, col-span-2 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
        className="md:col-span-2 relative overflow-hidden rounded-2xl p-7 md:p-8 bg-card border border-border shadow-card text-foreground"
      >
        <div className="relative z-10 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div className="max-w-md">
            <h3 className="font-display text-2xl md:text-[1.75rem] leading-tight text-foreground">
              Every booking gets a parent's sign-off.
            </h3>
            <p className="text-muted-foreground mt-2.5 text-[15px] leading-relaxed">
              Your teen can't accept a job without your explicit approval. You see the job details, the neighbor's verified profile, and the pay — then you decide.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Rated & reviewed — tall, row-span-2 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="md:row-span-2 rounded-2xl bg-card border border-border p-7 flex flex-col"
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
          style={{ backgroundColor: "hsl(38 92% 50% / 0.12)" }}
        >
          <Star className="w-6 h-6 text-amber-500" />
        </div>
        <h3 className="font-semibold text-lg text-foreground">Rated & reviewed</h3>
        <p className="text-muted-foreground mt-2 text-[15px] leading-relaxed flex-1">
          Every teen builds a public reputation from real neighbor reviews, and neighbors earn ratings too — so trust goes both ways before anyone books.
        </p>
        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Star className="w-4 h-4" />
            <span>Two-sided reviews</span>
          </div>
        </div>
      </motion.div>

      {/* Escrow payments — standard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="rounded-2xl bg-card border border-border p-7"
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
          style={{ backgroundColor: "hsl(154 64% 38% / 0.1)" }}
        >
          <Lock className="w-6 h-6 text-success" />
        </div>
        <h3 className="font-semibold text-lg text-foreground">Escrow payments</h3>
        <p className="text-muted-foreground mt-2 text-[15px] leading-relaxed">
          Neighbors pay up front. We hold it. Your teen gets paid only after the work is complete and you confirm it's done right.
        </p>
      </motion.div>

      {/* No home entry — standard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="rounded-2xl bg-card border border-border p-7"
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
          style={{ backgroundColor: "hsl(213 66% 17% / 0.06)" }}
        >
          <Home className="w-6 h-6 text-foreground" />
        </div>
        <h3 className="font-semibold text-lg text-foreground">Outdoor work only. Always.</h3>
        <p className="text-muted-foreground mt-2 text-[15px] leading-relaxed">
          Teens never enter a client's home — every job is outdoors or remote. It's the rule, not a suggestion.
        </p>
      </motion.div>
    </div>
  );
}