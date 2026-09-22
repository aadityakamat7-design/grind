import React, { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";

gsap.registerPlugin(ScrambleTextPlugin);

// Restrained, letters-only character set — reads as "text materializing,"
// not a glitch/hacker aesthetic. Keeps the warm-fintech calm.
const SCRAMBLE_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

// One-time scramble/decode animation on mount. Plays once, never loops.
// Renders the headline as two lines (matching the original <br /> structure),
// each scrambled independently with a small stagger so it feels deliberate.
export default function ScrambleHeadline({ lines, className, style }) {
  const line1Ref = useRef(null);
  const line2Ref = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      if (line1Ref.current) {
        tl.fromTo(
          line1Ref.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.15, ease: "power1.out" },
          0
        ).to(line1Ref.current, {
          duration: 0.9,
          ease: "power2.out",
          scrambleText: {
            text: lines[0],
            chars: SCRAMBLE_CHARS,
            speed: 0.6,
          },
        }, 0.05);
      }
      if (line2Ref.current && lines[1]) {
        tl.fromTo(
          line2Ref.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.15, ease: "power1.out" },
          0.35
        ).to(line2Ref.current, {
          duration: 0.9,
          ease: "power2.out",
          scrambleText: {
            text: lines[1],
            chars: SCRAMBLE_CHARS,
            speed: 0.6,
          },
        }, 0.4);
      }
    });
    return () => ctx.revert();
  }, [lines]);

  return (
    <h1 className={className} style={style}>
      <span ref={line1Ref} style={{ display: "block" }}>{lines[0]}</span>
      <span ref={line2Ref} style={{ display: "block" }}>{lines[1] || ""}</span>
    </h1>
  );
}