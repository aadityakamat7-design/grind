import React, { useState, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

// Light / Dark / System theme toggle. Persists choice in localStorage and
// applies .force-light or .dark on <html> (system = neither class).
const STORAGE_KEY = "blockwork-theme";

function defaultTheme() {
  const ua = navigator.userAgent || "";
  const isApple = /iPhone|iPad|iPod|Macintosh|Mac OS X/i.test(ua);
  return isApple ? "light" : "dark";
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.remove("force-light", "dark");
  if (theme === "light") root.classList.add("force-light");
  else if (theme === "dark") root.classList.add("dark");
  // "system" leaves both off so the @media query governs
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState("system");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) || defaultTheme();
    setTheme(saved);
    applyTheme(saved);
  }, []);

  const choose = (next) => {
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  };

  const opts = [
    { key: "light", label: "Light", icon: Sun },
    { key: "dark", label: "Dark", icon: Moon },
    { key: "system", label: "Auto", icon: Monitor },
  ];

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-3">
      <p className="text-[12px] font-semibold text-muted-foreground mb-2 px-1">Appearance</p>
      <div className="flex gap-1 bg-secondary rounded-full p-1">
        {opts.map((o) => {
          const Icon = o.icon;
          const active = theme === o.key;
          return (
            <button
              key={o.key}
              onClick={() => choose(o.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 text-[13px] font-semibold transition-all ${
                active ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}