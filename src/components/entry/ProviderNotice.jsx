import React from "react";
import { Button } from "@/components/ui/button";
import GoogleIcon from "@/components/GoogleIcon";
import AppleIcon from "@/components/AppleIcon";
import FacebookIcon from "@/components/FacebookIcon";
import AuthMessage from "@/components/entry/AuthMessage";
import BackLink from "@/components/entry/BackLink";
import useProviderSignIn from "@/components/entry/useProviderSignIn";
import { PROVIDER_LABELS } from "@/lib/authProviders";

const ICONS = { google: GoogleIcon, apple: AppleIcon, facebook: FacebookIcon };

// Shown when the typed email already belongs to an account that signed up with
// Google, Apple or Facebook. No duplicate account is created — the person is sent
// to the same provider.
export default function ProviderNotice({ email, provider, params, onBack }) {
  const social = useProviderSignIn(params);
  const Icon = ICONS[provider];
  return (
    <div className="space-y-4">
      <BackLink onClick={onBack}>Use a different email</BackLink>
      <p className="text-sm text-foreground break-all">
        <span className="font-semibold">{email}</span> already has a Blockwork account, and it signs in with{" "}
        {PROVIDER_LABELS[provider]}.
      </p>
      <AuthMessage>{social.error}</AuthMessage>
      <Button className="w-full h-12 font-medium" variant="outline" disabled={social.busy} onClick={() => social.start(provider)}>
        {Icon && <Icon className="w-5 h-5 mr-2" />}
        Continue with {PROVIDER_LABELS[provider]}
      </Button>
    </div>
  );
}