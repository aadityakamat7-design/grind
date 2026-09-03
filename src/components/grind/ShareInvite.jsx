import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Share2 } from "lucide-react";

// Two ways to share the same working invite link:
// copy the link and the native share sheet.
export default function ShareInvite({ code }) {
  const [copied, setCopied] = useState(false);

  const inviteUrl = `${window.location.origin}/onboarding?code=${code}`;
  const shareText = `Hey! I'm joining Blockwork to earn money doing local jobs. I need you to approve my account — sign up as a Parent and enter my code: ${code}\n\n${inviteUrl}`;

  const copyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join me on Blockwork", text: shareText });
      } catch { /* user cancelled */ }
    } else {
      copyLink();
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Input readOnly value={inviteUrl} className="rounded-xl text-xs font-mono h-10" />
        <Button variant="outline" size="sm" className="rounded-xl shrink-0 h-10 px-3" onClick={copyLink}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
      <Button variant="outline" className="w-full rounded-xl h-10" onClick={share}>
        <Share2 className="w-4 h-4 mr-1.5" /> Share via…
      </Button>
    </div>
  );
}