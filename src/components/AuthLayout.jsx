import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, BadgeCheck, Lock, Boxes } from "lucide-react";

const TRUST_POINTS = [
  { icon: ShieldCheck, text: "Every job parent-approved" },
  { icon: BadgeCheck, text: "ID-verified neighbors" },
  { icon: Lock, text: "Payments held safely in escrow" },
];

export default function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left column — form */}
      <div className="w-full md:w-[45%] flex flex-col min-h-screen px-6 sm:px-10 lg:px-16 py-8">
        {/* Wordmark */}
        <Link to="/" className="flex items-center gap-2.5 self-start">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-soft">
            <Boxes className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground font-heading">Blockwork</span>
        </Link>

        {/* Vertically centered form block */}
        <div className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-[400px]">
            <h1 className="text-[28px] font-bold tracking-tight text-foreground leading-tight">{title}</h1>
            {subtitle && <p className="text-muted-foreground mt-2 text-[15px] leading-relaxed">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <p className="text-sm text-muted-foreground mt-8">{footer}</p>}
          </div>
        </div>

        {/* Legal links */}
        <div className="flex items-center gap-5 text-xs text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground hover:underline">Terms</Link>
          <Link to="/privacy" className="hover:text-foreground hover:underline">Privacy</Link>
          <span>© {new Date().getFullYear()} Blockwork</span>
        </div>
      </div>

      {/* Right column — visual panel (hidden below md) */}
      <div
        className="hidden md:flex md:w-[55%] min-h-screen relative overflow-hidden"
        style={{ backgroundColor: "hsl(213 66% 17%)" }}
      >
        {/* Soft radial glow for depth */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 30% 20%, hsl(219 74% 53% / 0.28), transparent 55%), radial-gradient(circle at 75% 85%, hsl(219 80% 40% / 0.22), transparent 50%)",
          }}
        />

        {/* Brand message + trust points */}
        <div className="relative z-10 flex flex-col justify-center px-12 lg:px-20 py-16 max-w-2xl">
          <h2 className="text-4xl lg:text-[2.75rem] font-bold text-white tracking-tight leading-[1.1] font-heading">
            Neighborhood work. Neighborhood teens.
          </h2>
          <p className="text-white/70 text-lg mt-6 leading-relaxed max-w-lg">
            The neighborhood marketplace where teens find safe local work — with a parent approving every step.
          </p>
          <div className="mt-12 space-y-5">
            {TRUST_POINTS.map(({ icon: TIcon, text }) => (
              <div key={text} className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                  <TIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-white/90 font-medium text-[15px]">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}