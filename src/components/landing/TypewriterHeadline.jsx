import React, { useRef, useEffect, useState } from "react";

// Typewriter reveal: full text is present in the DOM from initial render
// (so LCP fires immediately and the accessibility tree contains a complete
// <h1>). A background-colored overlay covers each line and GSAP — loaded
// lazily via dynamic import() so it's off the critical path — animates the
// overlay width from 100% to 0%, revealing the text left-to-right. If GSAP
// fails to load or the user prefers reduced motion, the overlays collapse
// instantly and the full text is shown.
export default function TypewriterHeadline({ lines, className, style }) {
  const overlay1Ref = useRef(null);
  const overlay2Ref = useRef(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDone(true);
      return;
    }

    setDone(false);
    let cleaned = false;
    let cleanup = () => {};

    // Fallback: if GSAP doesn't load within 2s, reveal full text
    const fallbackTimer = setTimeout(() => {
      if (!cleaned) {
        setDone(true);
        if (overlay1Ref.current) overlay1Ref.current.style.width = "0%";
        if (overlay2Ref.current) overlay2Ref.current.style.width = "0%";
      }
    }, 2000);

    import("gsap")
      .then(({ gsap }) => {
        if (cleaned) return;
        clearTimeout(fallbackTimer);

        const charDuration = 0.038;
        const line1Duration = lines[0].length * charDuration;
        const line2Duration = lines[1] ? lines[1].length * charDuration : 0;

        const ctx = gsap.context(() => {
          const tl = gsap.timeline({
            onComplete: () => setDone(true),
          });

          tl.fromTo(
            overlay1Ref.current,
            { width: "100%" },
            { width: "0%", duration: line1Duration, ease: "none" },
            0
          );

          if (overlay2Ref.current && lines[1]) {
            tl.fromTo(
              overlay2Ref.current,
              { width: "100%" },
              { width: "0%", duration: line2Duration, ease: "none" },
              line1Duration
            );
          }
        });

        cleanup = () => ctx.revert();
      })
      .catch(() => {
        if (!cleaned) {
          setDone(true);
          if (overlay1Ref.current) overlay1Ref.current.style.width = "0%";
          if (overlay2Ref.current) overlay2Ref.current.style.width = "0%";
        }
      });

    return () => {
      cleaned = true;
      clearTimeout(fallbackTimer);
      cleanup();
    };
  }, [lines]);

  const overlayStyle = {
    position: "absolute",
    top: 0,
    right: 0,
    height: "100%",
    width: "100%",
    backgroundColor: "hsl(var(--background))",
    pointerEvents: "none",
    zIndex: 1,
  };

  return (
    <h1 className={className} style={style}>
      <span style={{ display: "block", position: "relative" }}>
        <span style={{ position: "relative", zIndex: 0 }}>{lines[0]}</span>
        <span ref={overlay1Ref} style={done ? { ...overlayStyle, width: "0%" } : overlayStyle} />
      </span>
      <span style={{ display: "block", position: "relative" }}>
        <span style={{ position: "relative", zIndex: 0 }}>
          {lines[1] || ""}
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: "0.04em",
              marginLeft: "0.06em",
              height: "0.9em",
              verticalAlign: "-0.08em",
              backgroundColor: "currentColor",
              opacity: done ? 0 : 1,
              animation: done ? "none" : "tw-blink 1s step-end infinite",
            }}
          />
        </span>
        <span ref={overlay2Ref} style={done ? { ...overlayStyle, width: "0%" } : overlayStyle} />
      </span>
    </h1>
  );
}