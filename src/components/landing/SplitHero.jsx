import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ShieldCheck, UserCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import Phone3D from "./Phone3D";

gsap.registerPlugin(ScrollTrigger);

const TRUST_POINTS = [
  { icon: ShieldCheck, text: "Parent-approved bookings" },
  { icon: UserCheck, text: "ID-verified neighbors" },
  { icon: Wallet, text: "Payments held safely until the job's done" },
];

// Split hero: text left, 3D-tilted phone right. The unlock/tilt animation is
// scroll-scrubbed via GSAP ScrollTrigger (scrub: true) while the section is
// pinned, so it plays out fully before the page scrolls past it, and reverses
// cleanly on scroll up.
export default function SplitHero({ onGetStarted, onLogin }) {
  const containerRef = useRef(null);
  const pinRef = useRef(null);
  const progressRef = useRef(0);

  useEffect(() => {
    const trigger = ScrollTrigger.create({
      trigger: containerRef.current,
      pin: pinRef.current,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        progressRef.current = self.progress;
      },
    });
    return () => trigger.kill();
  }, []);

  return (
    <div ref={containerRef} className="relative" style={{ height: "300vh" }}>
      <div ref={pinRef} className="h-screen w-full overflow-hidden flex items-center">
        <div className="relative z-10 max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-[45%_55%] gap-10 md:gap-6 items-center w-full">
          {/* Left column */}
          <div className="text-center md:text-left order-2 md:order-1">
            <h1 className="text-4xl sm:text-5xl md:text-[3.2rem] font-extrabold tracking-tight leading-[1.05] text-white">
              Your first paycheck starts here.
            </h1>
            <p className="text-white/70 text-lg mt-5 max-w-md mx-auto md:mx-0">
              Kickstart is where teens earn real money doing local jobs — safely, with a parent approving every step.
            </p>

            <ul className="mt-7 space-y-3 flex flex-col items-center md:items-start">
              {TRUST_POINTS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span className="text-sm font-semibold text-white/80">{text}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start mt-8">
              <Button className="h-12 px-8 rounded-xl text-base font-bold bg-white text-slate-950 hover:bg-white/90" onClick={onGetStarted}>
                Get Started
              </Button>
              <Button
                variant="outline"
                className="h-12 px-8 rounded-xl text-base font-bold bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white"
                onClick={onLogin}
              >
                Log in
              </Button>
            </div>
          </div>

          {/* Right column */}
          <div className="order-1 md:order-2">
            <Phone3D progressRef={progressRef} />
          </div>
        </div>
      </div>
    </div>
  );
}