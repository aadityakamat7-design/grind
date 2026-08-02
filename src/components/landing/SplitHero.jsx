import React from "react";
import { ShieldCheck, UserCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import Phone3D from "./Phone3D";

const TRUST_POINTS = [
  { icon: ShieldCheck, text: "Parent-approved bookings" },
  { icon: UserCheck, text: "ID-verified neighbors" },
  { icon: Wallet, text: "Payments held safely until the job's done" },
];

// Split hero: text left, floating 3D-tilted phone right.
export default function SplitHero({ onGetStarted, onLogin }) {
  return (
    <div className="relative min-h-[90vh] flex items-center py-16">
      <div className="relative z-10 max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-[45%_55%] gap-10 md:gap-6 items-center w-full">
        {/* Left column */}
        <div className="text-center md:text-left order-2 md:order-1">
          <h1 className="text-4xl sm:text-5xl md:text-[3.2rem] font-bold tracking-tight leading-[1.05] text-foreground">
            Teens earn. Neighbors get things done.
          </h1>
          <p className="text-muted-foreground text-lg mt-5 max-w-md mx-auto md:mx-0 leading-relaxed">
            Kickstart connects local teens with neighbors who need a hand — real paychecks for teens, reliable help for neighbors, with a parent approving every step.
          </p>

          <ul className="mt-7 space-y-3 flex flex-col items-center md:items-start">
            {TRUST_POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-primary-foreground" />
                </span>
                <span className="text-sm font-medium text-foreground/80">{text}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start mt-8">
            <Button
              className="h-12 px-8 rounded-xl text-base font-medium"
              onClick={onGetStarted}
            >
              Get Started
            </Button>
            <Button
              variant="outline"
              className="h-12 px-8 rounded-xl text-base font-medium bg-transparent border-border text-foreground hover:bg-accent"
              onClick={onLogin}
            >
              Log in
            </Button>
          </div>
        </div>

        {/* Right column */}
        <div className="order-1 md:order-2">
          <Phone3D />
        </div>
      </div>
    </div>
  );
}