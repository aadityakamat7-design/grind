import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, BadgeCheck, Lock } from "lucide-react";
import Phone3D from "./Phone3D";

gsap.registerPlugin(ScrollTrigger);

// Split hero: serif headline + trust points left, 3D phone right.
// Desktop: GSAP ScrollTrigger pins and scrubs the phone from tilted to straight.
// Mobile: no pin, no scrub — a gentle CSS float only.
export default function SplitHero({ onGetStarted, onLogin }) {
  const heroRef = useRef(null);
  const phoneRef = useRef(null);

  useEffect(() => {
    const mm = gsap.matchMedia();

    // Desktop only (768px+): scroll-pinned phone reveal
    mm.add("(min-width: 768px)", () => {
      const ctx = gsap.context(() => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "+=80%",
            scrub: 0.8,
            pin: true,
            pinSpacing: true,
          },
        });

        // Phone tilts from angled to straight-on as the user scrolls
        tl.fromTo(
          phoneRef.current,
          { rotateY: -16, rotateX: 6, y: 30, opacity: 0.35 },
          { rotateY: 0, rotateX: 0, y: 0, opacity: 1, ease: "power2.out" }
        );
      }, heroRef);

      return () => ctx.revert();
    });

    return () => mm.revert();
  }, []);

  return (
    <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden">
      {/* Subtle background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 50% at 70% 30%, hsl(219 74% 53% / 0.06), transparent 60%)" }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-[45%_55%] gap-8 md:gap-12 items-center w-full py-20 md:py-0">
        {/* Left: text content */}
        <div className="text-center md:text-left order-2 md:order-1">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-5"
          >
            Parent-approved teen work
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-5xl sm:text-6xl md:text-[3.5rem] leading-[1.05] tracking-tight text-foreground"
          >
            Neighborhood work.<br />Neighborhood teens.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-muted-foreground text-lg mt-6 max-w-md mx-auto md:mx-0 leading-relaxed"
          >
            The local marketplace where teens earn real paychecks doing outdoor work and online tutoring — with a parent approving every step.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start mt-8"
          >
            <Button size="lg" onClick={onGetStarted} className="group">
              Get started
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
            </Button>
            <Button variant="outline" size="lg" onClick={onLogin}>
              Log in
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex items-center gap-5 justify-center md:justify-start mt-8"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-success" />
              <span className="text-sm text-muted-foreground font-medium">Parent-approved</span>
            </div>
            <div className="flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground font-medium">ID-verified</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-foreground" />
              <span className="text-sm text-muted-foreground font-medium">Escrow</span>
            </div>
          </motion.div>
        </div>

        {/* Right: phone (desktop: GSAP scroll reveal, mobile: CSS float) */}
        <div className="order-1 md:order-2">
          {/* Mobile: gentle float, no scroll-lock */}
          <div className="md:hidden" style={{ animation: "float 4s ease-in-out infinite" }}>
            <Phone3D />
          </div>
          {/* Desktop: GSAP controls the 3D transform via scroll */}
          <div className="hidden md:block" style={{ perspective: "1400px" }}>
            <div ref={phoneRef} style={{ transformStyle: "preserve-3d", willChange: "transform, opacity" }}>
              <Phone3D />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}