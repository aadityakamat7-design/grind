import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import ScrambleHeadline from "./ScrambleHeadline";

// Typography-led hero: Fraunces headline with a one-time GSAP scramble/decode
// animation on load. No device mockup, gradients, or decorative blobs —
// white background, hairline structure, native scroll only.
export default function SplitHero() {
  const navigate = useNavigate();
  return (
    <section className="relative min-h-[100svh] flex items-center overflow-hidden bg-background">
      <div className="relative z-10 max-w-3xl mx-auto px-6 w-full py-16 md:py-0">
        <div className="text-center md:text-left">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-5"
          >
            Parent-approved teen work
          </motion.p>

          <ScrambleHeadline
            lines={["Your block.", "Your list."]}
            className="font-display text-foreground"
            style={{
              fontWeight: 600,
              fontSize: "clamp(38px, 5.5vw, 72px)",
              lineHeight: 1.06,
              letterSpacing: "-0.02em",
            }}
          />

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08, ease: "easeOut" }}
            className="text-muted-foreground text-lg mt-6 max-w-md mx-auto md:mx-0 leading-relaxed"
            style={{ fontFamily: "var(--font-body)" }}
          >
            The local marketplace where California teens earn real paychecks doing outdoor work and online tutoring — with a parent approving every step. Now available in California.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.24, ease: "easeOut" }}
            className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start mt-8"
          >
            <Button size="lg" onClick={() => navigate("/register")}>
              Get Started <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate("/how-it-works")}>
              Learn More
            </Button>
          </motion.div>
        </div>

      </div>
    </section>
  );
}