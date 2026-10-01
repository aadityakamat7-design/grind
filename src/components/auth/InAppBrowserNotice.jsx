import React, { useState } from "react";
import { ExternalLink, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openInBrowser, copyText } from "@/lib/inAppBrowser";

// Shown when Blockwork was opened inside another app's browser. Google and Apple
// sign-in are blocked there; email always works.
export default function InAppBrowserNotice({ appName, url }) {
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const open = async () => {
    const result = await openInBrowser(url);
    if (result === "copied") setMsg("Link copied. Open Safari or Chrome and paste it in the address bar.");
    if (result === "failed") setMsg("Couldn't copy the link. Long-press the address bar and type blockwork.online.");
  };

  const copy = async () => {
    const ok = await copyText(url);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5" role="note">
      <p className="text-[13px] font-semibold text-foreground leading-snug">
        For Google or Apple sign-in, open Blockwork in Safari or Chrome.
      </p>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
        You're inside {appName === "this app" ? "another app's" : `${appName}'s`} built-in browser, which blocks those
        sign-ins. Signing up with your email works right here.
      </p>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <Button type="button" size="sm" className="h-10" onClick={open}>
          <ExternalLink className="w-4 h-4" /> Open in browser
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-10" onClick={copy}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
      {msg && <p className="text-xs text-foreground mt-2 leading-relaxed">{msg}</p>}
    </div>
  );
}