import React, { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";

gsap.registerPlugin(ScrambleTextPlugin);

const SCRAMBLE_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

// One-time scramble/decode animation on mount. Plays once, never loops.
// The target text materializes from random letters into the final string.
export default function ScrambleText({ text, className, style, as: Tag = "span", delay = 0.1 }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.15, ease: "power1.out", delay }
      );
      gsap.to(ref.current, {
        duration: 1.1,
        ease: "power2.out",
        delay,
        scrambleText: {
          text,
          chars: SCRAMBLE_CHARS,
          speed: 0.6,
        },
      });
    });
    return () => ctx.revert();
  }, [text, delay]);

  return (
    <Tag ref={ref} className={className} style={style}>
      {text}
    </Tag>
  );
}