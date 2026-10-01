import React, { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import AuthLayout from "@/components/AuthLayout";
import AgeGateStep from "@/components/auth/AgeGateStep";
import ContactEmailStep from "@/components/auth/ContactEmailStep";
import AuthMessage from "@/components/entry/AuthMessage";
import BackLink from "@/components/entry/BackLink";
import useReferral from "@/components/entry/useReferral";
import TeenOnboarding from "@/components/grind/onboarding/TeenOnboarding";
import TeenParentLinkScreen from "@/components/grind/onboarding/TeenParentLinkScreen";
import ParentProfileStep from "@/components/grind/onboarding/ParentProfileStep";
import ParentLinkStep from "@/components/grind/onboarding/ParentLinkStep";
import BuyerOnboarding from "@/components/grind/onboarding/BuyerOnboarding";
import FinishOnboarding from "@/components/grind/onboarding/FinishOnboarding";
import { apiCode, apiError } from "@/lib/authErrors";
import { ROLE_HOME, decideRoute, isFinished, startUrl } from "@/lib/entryRoute";
import { signOut } from "@/lib/signOut";

function Spinner({ text }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10">
      <div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

// The signed-in half of /start. Right after every sign-in it asks the server to
// attach what was saved earlier (age check, invite code, destination) and then
// routes from the server's data alone:
//   1. a finished account      → its saved destination, else its dashboard
//   2. an unfinished account   → the next sign-up step, right here
// Nothing else redirects, so routes cannot fight each other.
export default function SetupFlow({ user, reload, params }) {
  const finished = isFinished(user);
  const [intent, setIntent] = useState({ dest: params.dest, code: params.code });
  const [claimDone, setClaimDone] = useState(false);
  const [notice, setNotice] = useState("");
  const [fatal, setFatal] = useState("");
  const [target, setTarget] = useState("");
  const [attempt, setAttempt] = useState(0);
  const running = useRef(false);
  useReferral(user, params);

  const claim = async (extra = {}) => {
    const res = await base44.functions.invoke("claimSignup", {
      token: params.st,
      am: params.am,
      dest: params.dest,
      code: params.code,
      ...extra,
    });
    return res.data;
  };

  useEffect(() => {
    if (running.current || target || fatal || (claimDone && !finished)) return;
    running.current = true;
    (async () => {
      try {
        const data = await claim();
        if (finished) {
          setTarget(decideRoute(user, data));
          return;
        }
        setIntent({ dest: data.dest || params.dest, code: data.code || params.code });
        setClaimDone(true);
        // Drop the used token from the address bar so a refresh can't retry it.
        window.history.replaceState({}, "", startUrl({ dest: params.dest, code: params.code, role: params.role, ref: params.ref }));
        await reload();
      } catch (err) {
        if (finished) return setTarget(decideRoute(user, { dest: params.dest, code: params.code }));
        if (apiCode(err) === "expired") {
          setNotice(apiError(err, ""));
          setClaimDone(true);
        } else {
          setFatal(apiError(err, "Couldn't finish setting up your account. Check your connection and try again."));
        }
      } finally {
        running.current = false;
      }
    })();
  }, [finished, claimDone, target, fatal, attempt]);

  // The age screen after a sign-in that didn't bring one (a new Google account).
  const claimTyped = async (role, dob) => {
    try {
      await claim({ role, dateOfBirth: dob, token: undefined });
      await reload();
      return {};
    } catch (err) {
      if (apiCode(err) === "underage") setTimeout(() => signOut("/start"), 4000);
      return { error: apiError(err, "Couldn't check your date of birth. Try again in a moment.") };
    }
  };

  const changeRole = async () => {
    try {
      await base44.functions.invoke("resetSignup");
      await reload();
    } catch (err) {
      setNotice(apiError(err, "Couldn't go back a step. Check your connection and try again."));
    }
  };

  const restart = () => signOut(startUrl({ code: params.code, role: params.role, dest: params.dest }));

  if (target) return <Navigate to={target} replace />;

  if (fatal) {
    return (
      <AuthLayout title="We couldn't continue" subtitle="Your account is safe.">
        <div className="space-y-3">
          <AuthMessage>{fatal}</AuthMessage>
          <Button className="w-full h-12 font-medium" onClick={() => { setFatal(""); setAttempt((n) => n + 1); }}>Try again</Button>
          <Button variant="outline" className="w-full h-12 font-medium" onClick={restart}>Sign out</Button>
        </div>
      </AuthLayout>
    );
  }

  if (finished || !claimDone) {
    return (
      <AuthLayout title="One moment" subtitle="Picking up where you left off.">
        <Spinner text="Setting up your account…" />
      </AuthLayout>
    );
  }

  // A sign-in that returned no email address (Facebook) can't receive approvals,
  // receipts or payout notices — ask for one first.
  if (!user.email && !user.contact_email) {
    return (
      <AuthLayout title="One more thing" subtitle="We need an email address to keep you posted.">
        <ContactEmailStep onSaved={reload} />
      </AuthLayout>
    );
  }

  if (!user.signup_claimed_at) {
    return (
      <AuthLayout title="Set up your account" subtitle="Your role and age set up the right account.">
        <AgeGateStep
          initialRole={params.role || null}
          lockRole={params.roleLocked || !!intent.code}
          notice={notice}
          onBack={restart}
          onSubmit={claimTyped}
        />
      </AuthLayout>
    );
  }

  const role = String(user.signup_role || user.app_role || "").toLowerCase();
  const step = user.onboarding_step || "";

  if (step === "account_created") {
    return (
      <AuthLayout title="Set up your account" subtitle="Tell us a bit about yourself to get started.">
        {!intent.code && <BackLink onClick={changeRole}>Change role</BackLink>}
        {notice && <div className="mb-4"><AuthMessage>{notice}</AuthMessage></div>}
        {role === "teen" && <TeenOnboarding user={user} onProfileSaved={reload} />}
        {role === "parent" && <ParentProfileStep user={user} onSaved={reload} />}
        {role === "buyer" && <BuyerOnboarding user={user} onProfileSaved={reload} />}
      </AuthLayout>
    );
  }

  if (step === "profile_complete") {
    const isParent = role === "parent";
    return (
      <AuthLayout
        title={isParent ? "Link your teen" : "Link your parent"}
        subtitle={isParent ? "Approve what your teen does — you can also do this later." : "Nothing goes live until your parent links."}
      >
        {isParent ? (
          <ParentLinkStep user={user} initialCode={intent.code || user.pending_invite_code || ""} onDone={() => ROLE_HOME.parent} />
        ) : (
          <TeenParentLinkScreen user={user} />
        )}
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Almost there" subtitle="Finishing your account…">
      <FinishOnboarding home={ROLE_HOME[role] || "/"} />
    </AuthLayout>
  );
}