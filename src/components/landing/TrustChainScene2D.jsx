import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { User, Users, Home, ShieldCheck } from "lucide-react";

const NODES = [
  { key: "teen", label: "Teen", icon: User, x: 15 },
  { key: "parent", label: "Parent", icon: Users, x: 50 },
  { key: "neighbor", label: "Neighbor", icon: Home, x: 85 },
];

function clamp(v) {
  return Math.min(1, Math.max(0, v));
}

// Lightweight CSS/SVG version of the trust chain, used on mobile/low-power
// devices or while the 3D scene is loading. Exposes setProgress(0-1) so the
// parent can drive it directly from scroll (no internal timers/animation).
const TrustChainScene2D = forwardRef(function TrustChainScene2D(_, ref) {
  const line1Ref = useRef(null);
  const line2Ref = useRef(null);
  const nodeRefs = useRef({});
  const lockRef = useRef(null);

  useImperativeHandle(ref, () => ({
    setProgress(p) {
      const teen = clamp(p / 0.25);
      const line1 = clamp((p - 0.25) / 0.25);
      const line2 = clamp((p - 0.5) / 0.25);
      const lock = clamp((p - 0.75) / 0.25);

      setNode("teen", teen);
      setNode("parent", line1 > 0 ? Math.min(1, line1 + 0.3) : 0);
      setNode("neighbor", line2 > 0 ? Math.min(1, line2 + 0.3) : 0);

      if (line1Ref.current) line1Ref.current.style.strokeDashoffset = String(35 * (1 - line1));
      if (line2Ref.current) line2Ref.current.style.strokeDashoffset = String(35 * (1 - line2));
      if (lockRef.current) {
        lockRef.current.style.opacity = String(lock);
        lockRef.current.style.transform = `translate(-50%, -50%) scale(${0.5 + lock * 0.5})`;
      }
    },
  }));

  function setNode(key, opacity) {
    const el = nodeRefs.current[key];
    if (!el) return;
    el.style.opacity = String(opacity);
    el.style.transform = `translate(-50%, -50%) scale(${0.7 + opacity * 0.3})`;
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-950 relative">
      <svg viewBox="0 0 100 60" className="w-full max-w-2xl" preserveAspectRatio="xMidYMid meet">
        <line ref={line1Ref} x1="15" y1="30" x2="50" y2="30" stroke="white" strokeWidth="0.5" opacity="0.5" strokeDasharray="35" strokeDashoffset="35" />
        <line ref={line2Ref} x1="50" y1="30" x2="85" y2="30" stroke="white" strokeWidth="0.5" opacity="0.5" strokeDasharray="35" strokeDashoffset="35" />
      </svg>
      <div className="absolute inset-0">
        {NODES.map((n) => {
          const Icon = n.icon;
          return (
            <div
              key={n.key}
              ref={(el) => (nodeRefs.current[n.key] = el)}
              className="absolute flex flex-col items-center gap-1.5"
              style={{
                left: `${n.x}%`,
                top: "50%",
                transform: "translate(-50%, -50%) scale(0.7)",
                opacity: n.key === "teen" ? 1 : 0,
              }}
            >
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md shadow-white/20">
                <Icon className="w-5 h-5 text-slate-950" />
              </div>
              <span className="text-[11px] font-bold text-white/80">{n.label}</span>
            </div>
          );
        })}
        <div
          ref={lockRef}
          className="absolute flex items-center justify-center"
          style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%) scale(0.5)", opacity: 0 }}
        >
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg shadow-white/30">
            <ShieldCheck className="w-6 h-6 text-slate-950" />
          </div>
        </div>
      </div>
    </div>
  );
});

export default TrustChainScene2D;