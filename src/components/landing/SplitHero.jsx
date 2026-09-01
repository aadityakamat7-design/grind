import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, BadgeCheck, Lock } from "lucide-react";
import Phone3D from "./Phone3D";

// Static split hero: Fraunces headline on a dark brand panel (left),
// phone at a fixed 3D tilt (right). No GSAP, no scroll-pinning, no
// scrubbing — scrolling is fully native. Only a one-time fade-and-rise
// on load (300–400ms). Section fade-ins are handled by IntersectionObserver
// (framer-motion whileInView) in the page, never blocking scroll.
export default function SplitHero({ onGetStarted, onLogin }) {
  return (
    <section
      className="relative min-h-[100svh] flex items-center overflow-hidden"
      style={{ backgroundColor: "hsl(var(--brand-dark))" }}
    >
      {/* Soft brand glow for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 50% at 70% 30%, hsl(219 74% 53% / 0.20), transparent 60%)" }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-[45%_55%] gap-8 md:gap-12 items-center w-full py-10 md:py-0">
        {/* Left: text content */}
        <div className="text-center md:text-left order-1">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="text-xs font-semibold text-white/60 uppercase tracking-[0.2em] mb-5"
          >
            Parent-approved teen work
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="font-display text-white"
            style={{
              fontWeight: 600,
              fontSize: "clamp(38px, 5.5vw, 72px)",
              lineHeight: 1.06,
              letterSpacing: "-0.02em",
            }}
          >
            Neighborhood work.<br />Neighborhood teens.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08, ease: "easeOut" }}
            className="text-white/70 text-lg mt-6 max-w-md mx-auto md:mx-0 leading-relaxed"
            style={{ fontFamily: "var(--font-body)" }}
          >
            The local marketplace where teens earn real paychecks doing outdoor work and online tutoring — with a parent approving every step.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.16, ease: "easeOut" }}
            className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start mt-8"
          >
            <Button size="lg" onClick={onGetStarted} className="group font-semibold">
              Get started
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={onLogin}
              className="font-semibold border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              Log in
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.24, ease: "easeOut" }}
            className="flex flex-wrap items-center gap-x-5 gap-y-2.5 justify-center md:justify-start mt-8"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-success" />
              <span className="text-sm text-white/70 font-medium">Parent-approved</span>
            </div>
            <div className="flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-primary" />
              <span className="text-sm text-white/70 font-medium">ID-verified</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-white/80" />
              <span className="text-sm text-white/70 font-medium">Escrow</span>
            </div>
          </motion.div>
        </div>

        {/* Right: phone at a fixed 3D tilt — no scroll animation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          className="order-2 md:order-2 hidden md:block"
          style={{ perspective: "1400px" }}
        >
          <div style={{ transform: "rotateY(-12deg) rotateX(4deg)", transformStyle: "preserve-3d" }}>
            <Phone3D />
          </div>
        </motion.div>
      </div>
    </section>
  );
}