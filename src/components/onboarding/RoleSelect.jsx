import React from "react";
import { GraduationCap, ShieldCheck, HomeIcon } from "lucide-react";

const ROLES = [
  { value: "teen", icon: GraduationCap, title: "I'm a teen (13–17)", desc: "List your skills, earn money in your neighborhood — with your parent in the loop." },
  { value: "parent", icon: ShieldCheck, title: "I'm a parent / guardian", desc: "Link to your teen, approve every job, and see everything they do." },
  { value: "buyer", icon: HomeIcon, title: "I'm a neighbor (18+)", desc: "Hire trusted, parent-approved teens nearby for tutoring, yard work, and more." },
];

export default function RoleSelect({ onSelect }) {
  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold tracking-tight mb-2">Welcome to Grind</h1>
      <p className="text-muted-foreground mb-8">Local skills. Teen-verified. Parent-visible. Who are you?</p>
      <div className="space-y-3">
        {ROLES.map((r) => {
          const Icon = r.icon;
          return (
            <button
              key={r.value}
              onClick={() => onSelect(r.value)}
              className="w-full text-left bg-card border border-border rounded-2xl p-5 flex items-start gap-4 hover:border-primary hover:shadow-md transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="font-heading font-bold">{r.title}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{r.desc}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}