import React, { useEffect, useRef } from "react";
import { ShieldCheck, Star, Wallet } from "lucide-react";

const JOBS = [
  { title: "Lawn mowing", price: "+$40.00", meta: "Completed · Sat" },
  { title: "Dog walking", price: "+$25.00", meta: "Completed · Mon" },
];

// Pure CSS 3D floating phone mockup showing the app UI. Continuously bobs and
// gently tilts, with desktop-only mouse parallax. GPU-accelerated
// (transform-only), no scroll-driven state.
export default function Phone3D() {
  const frameRef = useRef(null);
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
      const t = (now - start) / 1000;

      const rotY = -14 + mouseRef.current.x * 12;
      const rotX = 4 - mouseRef.current.y * 8;
      const bob = Math.sin(t * 1.2) * 8;

      if (frameRef.current) {
        frameRef.current.style.transform = `rotateY(${rotY}deg) rotateX(${rotX}deg) translateY(${bob}px)`;
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
  }, []);

  return (
    <div ref={wrapRef} className="relative mx-auto w-[240px] sm:w-[290px]" style={{ perspective: "1400px" }}>
      {/* Soft shadow beneath the phone for depth */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-[-2rem] w-[80%] h-8 bg-black/50 blur-2xl rounded-full" />

      <div
        ref={frameRef}
        className="relative rounded-[2.6rem] border border-white/15 bg-slate-900 p-2.5 shadow-2xl shadow-blue-950/60 will-change-transform"
        style={{ transformStyle: "preserve-3d" }}
      >
        <div className="relative rounded-[2rem] bg-gradient-to-b from-slate-950 to-slate-900 overflow-hidden aspect-[9/19.5]">
          <div className="absolute top-0 inset-x-0 h-7 flex justify-center items-end pb-1 z-20">
            <div className="w-20 h-4 rounded-full bg-black" />
          </div>

          <div className="absolute inset-0 pt-9 px-4 pb-5 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center">
                <span className="text-xs">👋</span>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 leading-none">Welcome back</p>
                <p className="text-xs font-bold text-white leading-tight">Alex · Verified Teen</p>
              </div>
            </div>

            <div className="rounded-2xl bg-white text-slate-950 p-3.5 mb-3">
              <p className="text-[10px] font-bold text-slate-500">This week's earnings</p>
              <p className="text-2xl font-extrabold tracking-tight text-emerald-600">$142.50</p>
              <div className="flex items-end gap-1 mt-2 h-6">
                {[40, 65, 30, 80, 55, 90, 70].map((h, i) => (
                  <div key={i} className="flex-1 bg-gradient-to-t from-blue-600 to-sky-400 rounded-sm" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>

            <p className="text-[10px] font-bold text-slate-400 mb-1.5">Recent jobs</p>
            <div className="space-y-2">
              {JOBS.map((j) => (
                <div key={j.title} className="flex items-center justify-between rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2">
                  <div>
                    <p className="text-[11px] font-bold text-white">{j.title}</p>
                    <p className="text-[9px] text-slate-400">{j.meta}</p>
                  </div>
                  <span className="text-[11px] font-extrabold text-emerald-400">{j.price}</span>
                </div>
              ))}
            </div>

            <div className="mt-auto flex items-center justify-between rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] font-bold text-white/80">Parent approved</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="text-[10px] font-bold text-white/80">4.9</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating glass badges */}
      <div className="absolute -right-10 top-10 hidden sm:flex items-center gap-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 px-3 py-2 shadow-lg">
        <Wallet className="w-3.5 h-3.5 text-sky-400" />
        <span className="text-[10px] font-bold text-white">Paid securely</span>
      </div>
    </div>
  );
}