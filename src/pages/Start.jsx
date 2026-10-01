import React, { useMemo } from "react";
import { useAppUser } from "@/lib/useAppUser";
import { readEntryParams } from "@/lib/entryRoute";
import EntryFlow from "@/components/entry/EntryFlow";
import SetupFlow from "@/components/entry/SetupFlow";
import LoopScreen from "@/components/entry/LoopScreen";

// /start — the single entry to Blockwork. Signed out: email or Google / Apple /
// Facebook, then sign-in or sign-up. Signed in: the saved destination, the next
// sign-up step, or the dashboard. /login, /signup, /register and /onboarding all
// redirect here with their address intact.
export default function Start() {
  const { user, loading, reload } = useAppUser();
  const params = useMemo(readEntryParams, []);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <EntryFlow params={params} />;
  if (params.loop) return <LoopScreen user={user} />;
  return <SetupFlow user={user} reload={reload} params={params} />;
}