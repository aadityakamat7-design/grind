import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { UserRound, Settings, LogOut } from "lucide-react";
import { signOut } from "@/lib/signOut";

// The profile menu: one tap on the avatar anywhere in the app opens the two
// account destinations every role shares, plus sign-out.
export default function ProfileMenu({ user, roleLabel, initials, compact = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [open]);

  const size = compact ? "w-7 h-7 text-[11px]" : "w-9 h-9 text-[13px]";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Profile menu"
        aria-expanded={open}
        className={`${size} rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0`}
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-60 bg-card border border-border rounded-2xl shadow-floating p-1.5 z-50">
          <div className="px-3 py-2.5 border-b border-border mb-1">
            <p className="text-[13px] font-semibold text-foreground truncate">{user.full_name || user.email}</p>
            <p className="text-[11px] text-muted-foreground truncate">{roleLabel}</p>
          </div>
          <Link
            to="/account?tab=account"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-foreground hover:bg-accent"
          >
            <UserRound className="w-4 h-4 text-muted-foreground" /> Account information
          </Link>
          <Link
            to="/account"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-foreground hover:bg-accent"
          >
            <Settings className="w-4 h-4 text-muted-foreground" /> Settings
          </Link>
          <button
            type="button"
            onClick={() => signOut("/")}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}