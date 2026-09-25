import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import TypewriterHeadline from "./TypewriterHeadline";

// Typography-led hero: Fraunces headline with a one-time GSAP typewriter
// reveal on load. The page-level gradient (in Welcome.jsx) sits behind this
// section; the section itself is transparent so the gradient shows through.
export default function SplitHero() {
  const navigate = useNavigate();
  return (
    <section className="relative min-h-[100svh] flex items-center overflow-hidden bg-transparent">
      <div className="relative z-10 max-w-3xl mx-auto px-6 w-full py-16 md:py-0 text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="text-xs font-semibold text-white/70 uppercase tracking-[0.2em] mb-5"
          >
            Parent-approved teen work
          </motion.p>

          <TypewriterHeadline
            lines={["Your block.", "Your list."]}
            className="font-grotesk text-white"
            style={{
              fontWeight: 600,
              fontSize: "clamp(48px, 8vw, 104px)",
              lineHeight: 1.04,
              letterSpacing: "-0.02em",
            }}
          />

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08, ease: "easeOut" }}
            className="text-white/80 text-lg mt-6 max-w-md mx-auto leading-relaxed"
            style={{ fontFamily: "var(--font-body)" }}
          >
            The local marketplace where California teens earn real paychecks doing outdoor work and online tutoring — with a parent approving every step. Now available in California.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.24, ease: "easeOut" }}
            className="flex flex-col sm:flex-row gap-3 justify-center mt-8"
          >
            <Button size="lg" onClick={() => navigate("/register")}>
              Get Started <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:border-white/50"
              onClick={() => navigate("/how-it-works")}
            >
              Learn More
            </Button>
          </motion.div>
      </div>
    </section>
  );
}