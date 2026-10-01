import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAppUser } from "@/lib/useAppUser";
import PageHeader from "@/components/grind/PageHeader";
import ParentLinkFlow from "@/components/grind/onboarding/ParentLinkFlow";
import { cleanCode } from "@/lib/entryRoute";

// /parent/link — a parent adding another teen, long after sign-up. Same flow the
// parent saw during onboarding; a parent can have more than one teen. An invite
// link opens here with ?code= already filled in.
export default function ParentLink() {
  const { user, loading } = useAppUser();
  const [linkedName, setLinkedName] = useState("");
  const [code] = useState(() => cleanCode(new URLSearchParams(window.location.search).get("code")));

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <PageHeader title="Add your teen" subtitle="Link another teen to your account." />
      {linkedName ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <p className="font-bold text-emerald-700">{linkedName} is linked</p>
          <p className="text-xs text-emerald-600 mt-1">
            You'll approve each service and job before it goes ahead.
          </p>
          <Link to="/parent" className="inline-block mt-3 text-sm font-semibold text-primary hover:underline">
            Back to dashboard
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <ParentLinkFlow user={user} initialCode={code} onLinked={(teen) => setLinkedName(teen?.teenName || "Your teen")} />
        </div>
      )}
    </div>
  );
}