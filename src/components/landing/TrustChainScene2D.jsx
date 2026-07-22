import React from "react";
import { User, Users, Home, ShieldCheck } from "lucide-react";

const NODES = [
  { key: "teen", label: "Teen", icon: User, x: 15 },
  { key: "parent", label: "Parent", icon: Users, x: 50 },
  { key: "neighbor", label: "Neighbor", icon: Home, x: 85 },
];

// Lightweight CSS/SVG version of the trust chain, used on mobile/low-power
// devices or while the 3D scene is loading. Driven by a discrete "stage"
// (0 = nothing connected, 1 = teen-parent drawn, 2 = both lines drawn, 3 = locked).
export default function TrustChainScene2D({ stage = 0 }) {
  const line1On = stage >= 1;
  const line2On = stage >= 2;
  const lockOn = stage >= 3;

  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-950 relative">
      <svg viewBox="0 0 100 60" className="w-full max-w-2xl" preserveAspectRatio="xMidYMid meet">
        <line
          x1="15" y1="30" x2="50" y2="30" stroke="white" strokeWidth="0.5" opacity="0.5"
          strokeDasharray="35" strokeDashoffset={line1On ? 0 : 35}
          style={{ transition: "stroke-dashoffset 1.2s ease" }}
        />
        <line
          x1="50" y1="30" x2="85" y2="30" stroke="white" strokeWidth="0.5" opacity="0.5"
          strokeDasharray="35" strokeDashoffset={line2On ? 0 : 35}
          style={{ transition: "stroke-dashoffset 1.2s ease" }}
        />
      </svg>
      <div className="absolute inset-0">
        {NODES.map((n) => {
          const Icon = n.icon;
          return (
            <div
              key={n.key}
              className="absolute flex flex-col items-center gap-1.5"
              style={{ left: `${n.x}%`, top: "50%", transform: "translate(-50%, -50%)" }}
            >
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md shadow-white/20">
                <Icon className="w-5 h-5 text-slate-950" />
              </div>
              <span className="text-[11px] font-bold text-white/80">{n.label}</span>
            </div>
          );
        })}
        <div
          className="absolute flex items-center justify-center transition-all duration-700"
          style={{
            left: "50%",
            top: "50%",
            transform: `translate(-50%, -50%) scale(${lockOn ? 1 : 0.5})`,
            opacity: lockOn ? 1 : 0,
          }}
        >
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg shadow-white/30">
            <ShieldCheck className="w-6 h-6 text-slate-950" />
          </div>
        </div>
      </div>
    </div>
  );
}