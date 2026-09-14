import React from "react";
import { ShieldCheck, Star, Zap, Video } from "lucide-react";

const LISTINGS = [
  { title: "Lawn mowing", price: "$40", meta: "Fixed · ZIP 94536", badge: null },
  { title: "Algebra 2 tutoring", price: "$25/hr", meta: "Online · ASAP", badge: "ASAP" },
  { title: "SUV wash & vacuum", price: "$35", meta: "Fixed · ZIP 94536", badge: null },
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
                <span className="text-sm font-bold text-primary-foreground">A</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground leading-none">Welcome back</p>
                <p className="text-xs font-semibold text-foreground leading-tight">Alex · Verified Teen</p>
              </div>
            </div>

            {/* My listings */}
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-semibold text-muted-foreground">My listings</p>
              <span className="text-xs font-semibold text-primary">Post a job</span>
            </div>
            <div className="space-y-2">
              {LISTINGS.map((l) => (
                <div key={l.title} className="rounded-xl bg-card border border-border px-3 py-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">{l.title}</p>
                    <span className="text-sm font-bold text-foreground">{l.price}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {l.badge && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber/15 text-amber px-1.5 py-0.5 text-[10px] font-bold uppercase">
                        <Zap className="w-2.5 h-2.5" /> {l.badge}
                      </span>
                    )}
                    {l.meta.includes("Online") && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-medium">
                        <Video className="w-2.5 h-2.5" /> Online
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">{l.meta}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom badge */}
            <div className="mt-auto flex items-center justify-between rounded-xl bg-card border border-border px-3 py-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-success" />
                <span className="text-sm font-medium text-foreground/80">Parent approved</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-foreground text-foreground" />
                <span className="text-sm font-medium text-foreground/80">4.9</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}