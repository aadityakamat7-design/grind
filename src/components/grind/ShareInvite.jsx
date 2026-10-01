import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Share2, MessageSquare, Loader2 } from "lucide-react";

// The invite link opens a static page (/invite.html) whose raw HTML carries the
// link-preview tags, so Messages and other apps can build a rich preview card
// without running JavaScript. The code travels in the query string — it is never
// part of the preview tags themselves.
const CANONICAL_ORIGIN = "https://blockwork.online";
const TEXT_BODY = "I'd like you to be my parent on Blockwork. Tap to link:";

// Shares ONE thing: the link. Passing a message alongside it (or a title) made
// iMessage send the text and the link as two separate bubbles, so the share
// sheet now receives the URL only and Messages builds the preview card itself.
// Repeat taps are ignored for 1.5s and while the sheet is open.
export default function ShareInvite({ code }) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const sharingRef = useRef(false);
  const lastTapRef = useRef(0);

  const inviteUrl = `${CANONICAL_ORIGIN}/invite.html?code=${encodeURIComponent(code)}`;
  const smsHref = `sms:?&body=${encodeURIComponent(`${TEXT_BODY} ${inviteUrl}`)}`;

  const copyLink = () => {
    try {
      navigator.clipboard.writeText(inviteUrl);
    } catch {
      /* clipboard unavailable — the link is still visible to copy by hand */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = async () => {
    const now = Date.now();
    if (sharingRef.current || now - lastTapRef.current < 1500) return;
    lastTapRef.current = now;
    sharingRef.current = true;
    setSharing(true);
    try {
      if (navigator.share) {
        // URL only — no text, no title. One message, with the preview card.
        await navigator.share({ url: inviteUrl });
      } else {
        // No share sheet (desktop): copy once and say so.
        copyLink();
      }
    } catch {
      /* the user closed the share sheet */
    } finally {
      sharingRef.current = false;
      setSharing(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Input readOnly value={inviteUrl} className="rounded-xl text-xs font-mono h-10" />
        <Button variant="outline" size="sm" className="rounded-xl shrink-0 h-10 px-3" onClick={copyLink} aria-label="Copy invite link">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
      <Button variant="outline" className="w-full rounded-xl h-10" disabled={sharing} onClick={share}>
        {sharing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Share2 className="w-4 h-4 mr-1.5" />}
        {sharing ? "Opening…" : "Share via…"}
      </Button>
      {copied && <p className="text-xs text-muted-foreground text-center">Invite link copied</p>}
      <Button variant="ghost" className="w-full rounded-xl h-10 text-muted-foreground" asChild>
        <a href={smsHref}>
          <MessageSquare className="w-4 h-4 mr-1.5" /> Text it
        </a>
      </Button>
    </div>
  );
}