import React, { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { TextPlugin } from "gsap/TextPlugin";

gsap.registerPlugin(TextPlugin);

// One-time typewriter reveal on mount: types each line out character by
// character (~38ms/char) with a thin blinking cursor that stops once typing
// finishes. Plays once, never loops. Font/size/weight/color come from the
// parent's className/style — this component only animates the text content.
export default function TypewriterHeadline({ lines, className, style }) {
  const line1Ref = useRef(null);
  const line2Ref = useRef(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDone(false);
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => setDone(true),
      });
      if (line1Ref.current) {
        tl.fromTo(
          line1Ref.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.1, ease: "power1.out" },
          0
        ).to(
          line1Ref.current,
          {
            duration: lines[0].length * 0.038,
            ease: "none",
            text: lines[0],
          },
          0.05
        );
      }
      if (line2Ref.current && lines[1]) {
        tl.fromTo(
          line2Ref.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.1, ease: "power1.out" },
          lines[0].length * 0.038 + 0.05
        ).to(
          line2Ref.current,
          {
            duration: lines[1].length * 0.038,
            ease: "none",
            text: lines[1],
          },
          lines[0].length * 0.038 + 0.1
        );
      }
    });
    return () => ctx.revert();
  }, [lines]);

  return (
    <h1 className={className} style={style}>
      <span ref={line1Ref} style={{ display: "block" }} />
      <span style={{ display: "block" }}>
        <span ref={line2Ref} />
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
    </h1>
  );
}