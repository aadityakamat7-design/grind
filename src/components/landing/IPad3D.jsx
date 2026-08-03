import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const SCREEN_ROWS = [
  { t: "Lawn mowing", d: "Sat", a: "+$40.00", c: "#00D47E", s: "Paid" },
  { t: "Dog walking", d: "Mon", a: "+$25.00", c: "#00D47E", s: "Paid" },
  { t: "Tutoring", d: "Wed", a: "$30.00", c: "#F2B84B", s: "Pending" },
];

export default function IPad3D({ triggerRef }) {
  const frameRef = useRef(null);
  const screenRef = useRef(null);
  const glowRef = useRef(null);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || !triggerRef.current) {
      if (frameRef.current) frameRef.current.style.transform = "rotateY(-8deg) rotateX(5deg)";
      if (screenRef.current) screenRef.current.style.opacity = "1";
      if (glowRef.current) glowRef.current.style.opacity = "0.5";
      return;
    }

    const startRotY = isMobile ? -40 : -75;
    const startRotX = isMobile ? 8 : 15;
    const endDist = isMobile ? "+=80%" : "+=120%";

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: triggerRef.current,
          start: "top top",
          end: endDist,
          pin: true,
          scrub: true,
          anticipatePin: 1,
        },
      });

      tl.fromTo(
        frameRef.current,
        { rotateY: startRotY, rotateX: startRotX },
        { rotateY: 0, rotateX: 0, ease: "none", duration: 1 }
      );

      tl.fromTo(
        screenRef.current,
        { opacity: 0 },
        { opacity: 1, ease: "power2.in", duration: 0.5 },
        0.4
      );

      tl.fromTo(
        glowRef.current,
        { opacity: 0 },
        { opacity: 0.7, ease: "power2.in", duration: 0.5 },
        0.3
      );
    });

    const t = setTimeout(() => ScrollTrigger.refresh(), 500);
    return () => {
      clearTimeout(t);
      ctx.revert();
    };
  }, [triggerRef]);

  const isMobileInit = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
  const initRotY = isMobileInit ? -40 : -75;
  const initRotX = isMobileInit ? 8 : 15;

  return (
    <div className="relative">
      {/* Shadow */}
      <div
        className="absolute left-1/2 -translate-x-1/2 -bottom-6 w-[65%] h-5 rounded-full"
        style={{ background: "rgba(0,0,0,0.35)", filter: "blur(20px)" }}
      />

      {/* 3D Scene */}
      <div className="relative" style={{ perspective: "2000px" }}>
        {/* Glow */}
        <div
          ref={glowRef}
          className="absolute inset-0"
          style={{
            opacity: 0,
            background: "radial-gradient(ellipse 55% 45% at 50% 50%, rgba(45,156,219,0.5), transparent 70%)",
            filter: "blur(30px)",
            willChange: "opacity",
          }}
        />

        {/* iPad Frame */}
        <div
          ref={frameRef}
          className="relative mx-auto"
          style={{
            width: "100%",
            maxWidth: 300,
            aspectRatio: "3 / 4",
            background: "linear-gradient(135deg, #1c1c1e, #0a0a0c)",
            borderRadius: 26,
            border: "2px solid #2a2a2e",
            padding: 10,
            boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
            transformStyle: "preserve-3d",
            transform: `rotateY(${initRotY}deg) rotateX(${initRotX}deg)`,
            willChange: "transform",
          }}
        >
          {/* Camera */}
          <div
            style={{
              position: "absolute",
              top: 4,
              left: "50%",
              transform: "translateX(-50%)",
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "#333",
              zIndex: 10,
            }}
          />

          {/* Screen */}
          <div
            className="relative w-full h-full overflow-hidden"
            style={{ background: "#000", borderRadius: 18 }}
          >
            {/* Screen off */}
            <div className="absolute inset-0" style={{ background: "#000" }} />

            {/* Screen on (app UI) */}
            <div
              ref={screenRef}
              className="absolute inset-0"
              style={{ opacity: 0, willChange: "opacity" }}
            >
              <div
                className="w-full h-full flex flex-col"
                style={{ background: "#000", fontFamily: "'Inter', sans-serif" }}
              >
                <div className="px-4 pt-5 pb-2">
                  <p style={{ color: "#8A8F98", fontSize: 9 }}>Total earned</p>
                  <p
                    style={{
                      fontFamily: "'Instrument Serif', serif",
                      fontSize: 28,
                      color: "#fff",
                      lineHeight: 1.1,
                    }}
                  >
                    $1,240.50
                  </p>
                  <p style={{ color: "#00D47E", fontSize: 9 }}>+$85.00 this week</p>
                </div>

                <div className="px-4 mt-1">
                  <svg viewBox="0 0 260 50" className="w-full" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="ipadGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2D9CDB" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#2D9CDB" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,40 L35,28 L70,33 L105,18 L140,22 L175,10 L210,14 L260,5"
                      fill="none"
                      stroke="#2D9CDB"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M0,40 L35,28 L70,33 L105,18 L140,22 L175,10 L210,14 L260,5 L260,50 L0,50 Z"
                      fill="url(#ipadGrad)"
                    />
                  </svg>
                </div>

                <div className="px-4 mt-2 flex gap-1.5">
                  {["1W", "1M", "3M", "1Y", "ALL"].map((r, i) => (
                    <span
                      key={r}
                      style={{
                        fontSize: 7,
                        padding: "2px 6px",
                        borderRadius: 999,
                        background: i === 1 ? "#2D9CDB" : "transparent",
                        color: i === 1 ? "#fff" : "#8A8F98",
                        border: `1px solid ${i === 1 ? "#2D9CDB" : "rgba(255,255,255,0.08)"}`,
                      }}
                    >
                      {r}
                    </span>
                  ))}
                </div>

                <div className="px-4 mt-3 space-y-1.5 flex-1">
                  {SCREEN_ROWS.map((r) => (
                    <div
                      key={r.t}
                      className="flex items-center justify-between"
                      style={{
                        background: "#0D0D0F",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 8,
                        padding: "6px 8px",
                      }}
                    >
                      <div>
                        <p style={{ color: "#fff", fontSize: 8, fontWeight: 600 }}>{r.t}</p>
                        <p style={{ color: "#8A8F98", fontSize: 7 }}>{r.d}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          style={{
                            color: r.c,
                            background: `${r.c}26`,
                            fontSize: 6,
                            padding: "1px 4px",
                            borderRadius: 999,
                            fontWeight: 500,
                          }}
                        >
                          {r.s}
                        </span>
                        <span style={{ color: r.c, fontSize: 8, fontWeight: 600 }}>{r.a}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}