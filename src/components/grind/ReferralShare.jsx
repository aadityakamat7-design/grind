import React, { useState } from "react";
import { Gift, Copy, Check, Share2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const BASE_URL = "https://blockwork.online";

export default function ReferralShare({ user }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const link = `${BASE_URL}/onboarding?ref=${user.id}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({ title: "Link copied!", description: "Share it with anyone who'd love Blockwork." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Couldn't copy", description: "Long-press the link to copy manually.", variant: "destructive" });
    }
  };

  const share = async () => {
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
      copy();
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
          className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 active:scale-95 transition-transform"
          aria-label="Copy link"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <button
        onClick={share}
        className="w-full h-11 rounded-full bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform shadow-glow"
      >
        <Share2 className="w-4 h-4" />
        Share invite link
      </button>
    </div>
  );
}