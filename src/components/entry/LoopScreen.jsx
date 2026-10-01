import React from "react";
import { Button } from "@/components/ui/button";
import AuthLayout from "@/components/AuthLayout";
import { signOut } from "@/lib/signOut";

// Shown after the loop guard stops a redirect loop for a signed-in person.
export default function LoopScreen({ user }) {
  return (
    <AuthLayout title="We stopped a loop" subtitle="Blockwork was sending you back and forth between pages, so we paused it.">
      <div className="space-y-3">
        <p className="text-sm text-foreground break-all">
          You're signed in as <span className="font-semibold">{user.email || user.contact_email || "this account"}</span>.
        </p>
        <Button className="w-full h-12 font-medium" onClick={() => { window.location.href = "/start"; }}>
          Try again
        </Button>
        <Button variant="outline" className="w-full h-12 font-medium" onClick={() => signOut("/start")}>
          Sign out
        </Button>
      </div>
    </AuthLayout>
  );
}