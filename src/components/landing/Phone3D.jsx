import React from "react";
import { ShieldCheck, Star } from "lucide-react";

const JOBS = [
  { title: "Lawn mowing", price: "+$40.00", meta: "Completed · Sat" },
  { title: "Dog walking", price: "+$25.00", meta: "Completed · Mon" },
];

// Pure visual phone mockup — no animation logic. The parent component
// controls perspective and motion (CSS float on mobile, GSAP on desktop).
export default function Phone3D() {
  return (
    <div className="relative mx-auto w-[240px] sm:w-[280px] force-light">
      {/* Soft shadow beneath the phone for depth */}
      <div className="absolute left-1/2 -translate-x-1/2 -bottom-8 w-[80%] h-8 bg-foreground/10 blur-2xl rounded-full" />

      {/* Frame */}
      <div className="relative rounded-[2.6rem] border border-border bg-foreground p-2.5 shadow-elevated">
        {/* Screen */}
        <div className="relative rounded-[2rem] bg-background overflow-hidden aspect-[9/19.5]">
          {/* Notch */}
          <div className="absolute top-0 inset-x-0 h-7 flex justify-center items-end pb-1 z-20">
            <div className="w-20 h-4 rounded-full bg-foreground" />
          </div>

          {/* Content */}
          <div className="absolute inset-0 pt-9 px-4 pb-5 flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary-foreground">A</span>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground leading-none">Welcome back</p>
                <p className="text-xs font-semibold text-foreground leading-tight">Alex · Verified Teen</p>
              </div>
            </div>

            {/* Earnings card — serif figure in amber */}
            <div className="rounded-2xl bg-card border border-border p-3.5 mb-3 shadow-soft">
              <p className="text-[10px] font-medium text-muted-foreground">This week's earnings</p>
              <p className="font-display text-3xl text-amber leading-none mt-1">$142.50</p>
              <div className="flex items-end gap-1 mt-2.5 h-6">
                {[40, 65, 30, 80, 55, 90, 70].map((h, i) => (
                  <div key={i} className="flex-1 bg-foreground/15 rounded-sm" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>

            {/* Recent jobs */}
            <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">Recent jobs</p>
            <div className="space-y-2">
              {JOBS.map((j) => (
                <div key={j.title} className="flex items-center justify-between rounded-xl bg-card border border-border px-3 py-2">
                  <div>
                    <p className="text-[11px] font-semibold text-foreground">{j.title}</p>
                    <p className="text-[9px] text-muted-foreground">{j.meta}</p>
                  </div>
                  <span className="text-[11px] font-bold text-foreground">{j.price}</span>
                </div>
              ))}
            </div>

            {/* Bottom badge */}
            <div className="mt-auto flex items-center justify-between rounded-xl bg-card border border-border px-3 py-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-success" />
                <span className="text-[10px] font-medium text-foreground/80">Parent approved</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-foreground text-foreground" />
                <span className="text-[10px] font-medium text-foreground/80">4.9</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}