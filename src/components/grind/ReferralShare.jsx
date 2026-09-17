import React, { useState, useRef } from "react";
import { Gift, Copy, Check, Share2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const BASE_URL = "https://blockwork.online";

// Re-entry guarded: a rapid double-tap can't open two share sheets
// or fire two copy actions (same bug class as the duplicate-booking fix).
export default function ReferralShare({ user }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const sharingRef = useRef(false);
  const link = `${BASE_URL}/onboarding?ref=${user.id}`;

  const copy = async () => {
    if (sharingRef.current) return;
    sharingRef.current = true;
    setSharing(true);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({ title: "Link copied!", description: "Share it with anyone who'd love Blockwork." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Couldn't copy", description: "Long-press the link to copy manually.", variant: "destructive" });
    } finally {
      sharingRef.current = false;
      setSharing(false);
    }
  };

  const share = async () => {
    if (sharingRef.current) return;
    sharingRef.current = true;
    setSharing(true);
    try {
      const roleLabel = user.app_role === "teen" ? "earn money doing local jobs" : "get help from trusted local teens";
      if (navigator.share) {
        try {
          await navigator.share({
            title: "Join me on Blockwork",
            text: `I'm using Blockwork to ${roleLabel}. Use my link to sign up:`,
            url: link,
          });
        } catch {}
      } else {
        await copy();
      }
    } finally {
      sharingRef.current = false;
      setSharing(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-primary/5 to-accent-amber/5 border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Gift className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-foreground text-[15px]">Invite a friend</h3>
          <p className="text-xs text-muted-foreground">Share Blockwork — help your neighbors find great help.</p>
        </div>
      </div>
      <div className="flex items-center gap-2 bg-card border border-border rounded-full pl-4 pr-1.5 py-1.5">
        <span className="text-xs text-muted-foreground truncate flex-1 font-mono">{link}</span>
        <button
          onClick={copy}
          disabled={sharing}
          className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 active:scale-95 transition-transform disabled:opacity-50"
          aria-label="Copy link"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <button
        onClick={share}
        disabled={sharing}
        className="w-full h-11 rounded-full bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform shadow-glow disabled:opacity-60"
      >
        {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
        {sharing ? "Opening…" : "Share invite link"}
      </button>
    </div>
  );
}