import React, { useEffect, useRef } from "react";
import { Lock, LockOpen, ShieldCheck, Star } from "lucide-react";

function clamp(v) {
  return Math.min(1, Math.max(0, v));
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}

const JOBS = [
  { title: "Lawn mowing", price: "+$40.00", meta: "Completed · Sat" },
  { title: "Dog walking", price: "+$25.00", meta: "Completed · Mon" },
];

// Pure CSS 3D phone mockup. Reads scroll progress (0-1) from progressRef every
// animation frame — never advances on its own — and layers in a subtle
// floating bob + desktop-only mouse parallax on top. All transforms are
// GPU-accelerated (transform/opacity only).
export default function Phone3D({ progressRef }) {
  const frameRef = useRef(null);
  const lockRef = useRef(null);
  const appRef = useRef(null);
  const wrapRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const wrap = wrapRef.current;

    function handleMouseMove(e) {
      const rect = wrap.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      mouseRef.current = { x: px, y: py };
    }
    function handleMouseLeave() {
      mouseRef.current = { x: 0, y: 0 };
    }
    if (!isTouch && wrap) {
      wrap.addEventListener("mousemove", handleMouseMove);
      wrap.addEventListener("mouseleave", handleMouseLeave);
    }

    let raf;
    const start = performance.now();
    function animate(now) {
      raf = requestAnimationFrame(animate);
      const p = clamp(progressRef.current || 0);
      const t = (now - start) / 1000;

      const unlock = clamp((p - 0.3) / 0.4);
      const present = clamp((p - 0.7) / 0.3);

      const rotY = lerp(-24, -6, p) + mouseRef.current.x * 10;
      const rotX = lerp(7, 1, p) - mouseRef.current.y * 8;
      const scale = lerp(0.88, 1.05, p) - present * 0.02;
      const bob = Math.sin(t * 1.2) * 6;

      if (frameRef.current) {
        frameRef.current.style.transform = `rotateY(${rotY}deg) rotateX(${rotX}deg) scale(${scale}) translateY(${bob}px)`;
      }
      if (lockRef.current) {
        lockRef.current.style.opacity = String(1 - unlock);
        lockRef.current.style.transform = `scale(${1 + unlock * 0.3}) rotate(${unlock * -18}deg)`;
      }
      if (appRef.current) {
        appRef.current.style.opacity = String(unlock);
        appRef.current.style.transform = `translateY(${(1 - unlock) * 14}px)`;
      }
    }
    animate(start);

    return () => {
      cancelAnimationFrame(raf);
      if (!isTouch && wrap) {
        wrap.removeEventListener("mousemove", handleMouseMove);
        wrap.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [progressRef]);

  return (
    <div ref={wrapRef} className="relative mx-auto w-[240px] sm:w-[290px]" style={{ perspective: "1400px" }}>
      {/* Soft shadow beneath the phone for depth */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-[-2rem] w-[80%] h-8 bg-black/50 blur-2xl rounded-full" />

      <div
        ref={frameRef}
        className="relative rounded-[2.6rem] border border-white/15 bg-slate-900 p-2.5 shadow-2xl shadow-black/60 will-change-transform"
        style={{ transformStyle: "preserve-3d" }}
      >
        <div className="relative rounded-[2rem] bg-black overflow-hidden aspect-[9/19.5]">
          <div className="absolute top-0 inset-x-0 h-7 flex justify-center items-end pb-1 z-20">
            <div className="w-20 h-4 rounded-full bg-black border border-white/10" />
          </div>

          {/* Lock screen layer */}
          <div ref={lockRef} className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/15 flex items-center justify-center">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <p className="text-xs font-bold text-white/60 tracking-wide">Locked</p>
          </div>

          {/* Unlocked app UI layer */}
          <div ref={appRef} className="absolute inset-0 pt-9 px-4 pb-5 flex flex-col opacity-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
                <LockOpen className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-white/50 leading-none">Welcome back</p>
                <p className="text-xs font-bold text-white leading-tight">Alex · Verified Teen</p>
              </div>
            </div>

            <div className="rounded-2xl bg-white text-slate-950 p-3.5 mb-3">
              <p className="text-[10px] font-bold text-slate-500">This week's earnings</p>
              <p className="text-2xl font-extrabold tracking-tight">$142.50</p>
              <div className="flex items-end gap-1 mt-2 h-6">
                {[40, 65, 30, 80, 55, 90, 70].map((h, i) => (
                  <div key={i} className="flex-1 bg-slate-900/80 rounded-sm" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>

            <p className="text-[10px] font-bold text-white/50 mb-1.5">Recent jobs</p>
            <div className="space-y-2">
              {JOBS.map((j) => (
                <div key={j.title} className="flex items-center justify-between rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2">
                  <div>
                    <p className="text-[11px] font-bold text-white">{j.title}</p>
                    <p className="text-[9px] text-white/40">{j.meta}</p>
                  </div>
                  <span className="text-[11px] font-extrabold text-white">{j.price}</span>
                </div>
              ))}
            </div>

            <div className="mt-auto flex items-center justify-between rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
                <span className="text-[10px] font-bold text-white/80">Parent approved</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-white text-white" />
                <span className="text-[10px] font-bold text-white/80">4.9</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}