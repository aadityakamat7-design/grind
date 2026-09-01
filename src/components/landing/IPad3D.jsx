import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function IPad3D({ triggerRef }) {
  const frameRef = useRef(null);
  const screenRef = useRef(null);
  const glowRef = useRef(null);

  // Load Instrument Serif + Inter for the screen content
  useEffect(() => {
    const id = "earnings-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);

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

  const isMobileInit =
    typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
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
            background:
              "radial-gradient(ellipse 55% 45% at 50% 50%, rgba(45,156,219,0.5), transparent 70%)",
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

            {/* Screen on — mini landing page replica */}
            <div
              ref={screenRef}
              className="absolute inset-0"
              style={{ opacity: 0, willChange: "opacity" }}
            >
              <div
                className="w-full h-full flex flex-col"
                style={{ background: "#000", fontFamily: "'Inter', sans-serif" }}
              >
                {/* Nav bar */}
                <div className="flex items-center justify-between px-3 pt-3">
                  <div className="flex items-center gap-1">
                    <div
                      style={{
                        width: 11,
                        height: 11,
                        borderRadius: 3,
                        background: "#2D9CDB",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg viewBox="0 0 24 24" style={{ width: 6, height: 6 }}>
                        <path
                          d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"
                          fill="#fff"
                        />
                      </svg>
                    </div>
                    <span
                      style={{
                        color: "#fff",
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      Blockwork
                    </span>
                  </div>
                  <span
                    style={{
                      color: "#fff",
                      fontSize: 7,
                      padding: "3px 8px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.15)",
                      fontWeight: 500,
                    }}
                  >
                    Get app
                  </span>
                </div>

                {/* Centered hero content */}
                <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                  <div
                    style={{
                      fontFamily: "'Instrument Serif', serif",
                      color: "#fff",
                      fontSize: 16,
                      lineHeight: 1.1,
                      fontWeight: 400,
                    }}
                  >
                    Teens earn. Neighbors get things done.
                  </div>
                  <p
                    style={{
                      color: "#8A8F98",
                      fontSize: 8,
                      marginTop: 6,
                      lineHeight: 1.4,
                    }}
                  >
                    Local jobs, parent-approved, paid safely.
                  </p>
                  <div
                    style={{
                      background: "#2D9CDB",
                      color: "#fff",
                      fontSize: 8,
                      padding: "5px 14px",
                      borderRadius: 999,
                      marginTop: 10,
                      fontWeight: 500,
                    }}
                  >
                    Get started
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}