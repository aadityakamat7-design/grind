import React, { useEffect, useRef, useState, Suspense, lazy } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import TrustChainScene2D from "./TrustChainScene2D";

gsap.registerPlugin(ScrollTrigger);

const TrustChainScene3D = lazy(() => import("./TrustChainScene3D"));

function isWebGLAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
  } catch (e) {
    return false;
  }
}

const CAPTIONS = [
  "A parent approves every booking.",
  "Every neighbor is ID-verified.",
  "Payments held safely until the job is done.",
];

// Scrollytelling hero: a tall (400vh) pinned section whose animation progress
// is driven entirely by GSAP ScrollTrigger's scrub value (0-1) — never by a
// timer or on load. Scrolling down advances it, scrolling up reverses it.
export default function TrustChainHero({ onGetStarted, onLogin }) {
  const containerRef = useRef(null);
  const pinRef = useRef(null);
  const progressRef = useRef(0);
  const scene2DRef = useRef(null);
  const [stage, setStage] = useState(0);
  const [use3D, setUse3D] = useState(false);

  useEffect(() => {
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 768;
    setUse3D(!mobile && isWebGLAvailable());
  }, []);

  useEffect(() => {
    const trigger = ScrollTrigger.create({
      trigger: containerRef.current,
      pin: pinRef.current,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        progressRef.current = p;
        scene2DRef.current?.setProgress(p);
        const nextStage = p < 0.25 ? 0 : p < 0.5 ? 1 : p < 0.75 ? 2 : 3;
        setStage((s) => (s !== nextStage ? nextStage : s));
      },
    });

    return () => trigger.kill();
  }, []);

  return (
    <div ref={containerRef} className="relative" style={{ height: "400vh" }}>
      <div ref={pinRef} className="h-screen w-full overflow-hidden flex flex-col items-center justify-center px-6">
        <div className="absolute inset-0">
          {use3D ? (
            <Suspense fallback={<TrustChainScene2D ref={scene2DRef} />}>
              <TrustChainScene3D progressRef={progressRef} />
            </Suspense>
          ) : (
            <TrustChainScene2D ref={scene2DRef} />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950 pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs font-bold text-white/80 mb-6">
            <ShieldCheck className="w-3.5 h-3.5" />
            Parent-approved · ID-verified · Escrow-protected
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05] text-white">
            Every job, parent-approved.
            <br />
            Every neighbor, verified.
          </h1>
          <p className="text-white/70 text-lg mt-6 min-h-[1.75rem] transition-opacity duration-500">
            {stage > 0 ? CAPTIONS[Math.min(stage - 1, CAPTIONS.length - 1)] : "Scroll to see how trust connects every job on KickStart."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-9">
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
          <p className="text-xs text-white/40 mt-5">Scroll to see the chain connect</p>
        </div>
      </div>
    </div>
  );
}