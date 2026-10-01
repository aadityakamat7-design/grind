import React from "react";
import { Button } from "@/components/ui/button";
import GoogleIcon from "@/components/GoogleIcon";
import AppleIcon from "@/components/AppleIcon";
import FacebookIcon from "@/components/FacebookIcon";
import InAppBrowserNotice from "@/components/auth/InAppBrowserNotice";
import { detectInAppBrowser } from "@/lib/inAppBrowser";
import { AUTH_PROVIDERS, PROVIDER_LABELS, BLOCKED_IN_APP_BROWSERS } from "@/lib/authProviders";

const ICONS = { google: GoogleIcon, apple: AppleIcon, facebook: FacebookIcon };

// "Continue with Google / Apple / Facebook" buttons plus the "or use email"
// divider. Only providers that work are shown. Inside another app's built-in
// browser the Google and Apple buttons are disabled and the "open in browser"
// notice appears instead; email sign-in below always works.
export default function SocialButtons({ onProvider, browserUrl, disabled = false }) {
  const inApp = detectInAppBrowser();
  const providers = Object.keys(AUTH_PROVIDERS).filter((p) => AUTH_PROVIDERS[p]);
  if (providers.length === 0) return null;

  return (
    <div>
      {inApp && <InAppBrowserNotice appName={inApp} url={browserUrl || window.location.href} />}
      <div className="space-y-3">
        {providers.map((p) => {
          const Icon = ICONS[p];
          const blocked = !!inApp && BLOCKED_IN_APP_BROWSERS.includes(p);
          return (
            <Button
              key={p}
              type="button"
              variant="outline"
              className="w-full h-12 text-sm font-medium"
              disabled={disabled || blocked}
              onClick={() => onProvider(p)}
            >
              <Icon className="w-5 h-5 mr-2" />
              Continue with {PROVIDER_LABELS[p]}
            </Button>
          );
        })}
      </div>
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or use email</span>
        </div>
      </div>
    </div>
  );
}