import React, { useRef, useEffect, useState } from "react";

// Auto-typing headline with a real typing cursor.
//
// Structure (the cursor is a SIBLING of the animated text, never inside it —
// TextPlugin rewrites the contents of the element it animates, so a cursor
// nested inside would be erased on the first frame):
//
//   <h1>
//     .sr-only      → the full headline, for search engines and screen readers
//     ghost copy    → visibility:hidden, reserves the full height from the first
//                     paint so nothing jumps while the text types
//     .type-text    → the only element TextPlugin animates
//     .type-cursor  → solid black bar, rides the text flow (wraps with it),
//                     blinks hard on/off once typing finishes
export default function TypewriterHeadline({ lines, className, style }) {
  const textRef = useRef(null);
  const [done, setDone] = useState(false);
  const [reduced, setReduced] = useState(false);
  const fullText = lines.filter(Boolean).join(" ");

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      // Show the whole headline at once with a solid (still) black bar.
      setReduced(true);
      setDone(true);
      if (textRef.current) textRef.current.textContent = fullText;
      return;
    }

    setReduced(false);
    setDone(false);
    if (textRef.current) textRef.current.textContent = "";

    let cleaned = false;
    let tween = null;

    const revealAll = () => {
      if (textRef.current) textRef.current.textContent = fullText;
      setDone(true);
    };

    // Fallback: if GSAP can't load, show the full headline rather than an empty one.
    const fallbackTimer = setTimeout(() => {
      if (!cleaned) revealAll();
    }, 2500);

    (async () => {
      try {
        const [{ gsap }, { TextPlugin }] = await Promise.all([
          import("gsap"),
          import("gsap/TextPlugin"),
        ]);
        if (cleaned) return;
        gsap.registerPlugin(TextPlugin);
        clearTimeout(fallbackTimer);
        tween = gsap.to(textRef.current, {
          // 40ms per letter, once, on load.
          duration: fullText.length * 0.04,
          text: fullText,
          ease: "none",
          onComplete: () => setDone(true),
        });
      } catch {
        if (!cleaned) {
          clearTimeout(fallbackTimer);
          revealAll();
        }
      }
    })();

    return () => {
      cleaned = true;
      clearTimeout(fallbackTimer);
      if (tween) tween.kill();
    };
  }, [fullText]);

  return (
    <h1 className={className} style={{ ...style, position: "relative" }}>
      <span className="sr-only">{fullText}</span>
      {/* Ghost copy: reserves the final height from the first paint (no jump)
          and keeps the full headline in the layout from the start. */}
      <span aria-hidden="true" style={{ display: "block", visibility: "hidden" }}>
        {fullText}
      </span>
      {/* Typed copy + cursor, laid over the ghost so the line breaks match. */}
      <span aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
        <span ref={textRef} className="type-text" />
        <span
          className={!reduced && done ? "type-cursor is-done" : "type-cursor"}
        />
      </span>
    </h1>
  );
}