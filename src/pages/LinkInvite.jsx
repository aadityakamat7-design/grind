import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import AuthLayout from "@/components/AuthLayout";
import AuthMessage from "@/components/entry/AuthMessage";
import { useAppUser } from "@/lib/useAppUser";
import { apiError } from "@/lib/authErrors";
import { cleanCode, isFinished, startUrl } from "@/lib/entryRoute";
import { signOut } from "@/lib/signOut";

const ROLE_NAMES = { teen: "teen", buyer: "neighbor", admin: "admin" };

function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" />
    </div>
  );
}

// /link/:code — what a parent sees when they open the invite link their teen sent.
//   signed out                  → "<teen> invited you…" + Continue (sign in or sign up)
//   signed in as a parent       → straight to the link confirmation, code filled in
//   signed in as a teen/neighbor→ a clear message + "Sign out and continue"
//   bad / used / expired code   → one plain message, nothing else
export default function LinkInvite() {
  const { code: rawCode } = useParams();
  const code = cleanCode(rawCode);
  const navigate = useNavigate();
  const { user, loading } = useAppUser();
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!code) return setInfo({ valid: false });
    base44.functions
      .invoke("inviteInfo", { code })
      .then((res) => setInfo(res.data))
      .catch((err) => setInfo({ valid: false, error: apiError(err, "") }));
  }, [code]);

  const role = user ? String(user.app_role || user.signup_role || "").toLowerCase() : "";
  const isParent = role === "parent";
  const continueUrl = startUrl({ code, role: "parent" });

  // A signed-in parent goes straight to the link confirmation; a signed-in person
  // with no role yet (or an unfinished parent) continues sign-up with the code.
  useEffect(() => {
    if (!user || !info?.valid) return;
    if (isParent && isFinished(user)) navigate(`/parent/link?code=${code}`, { replace: true });
    else if (!role || isParent) navigate(continueUrl, { replace: true });
  }, [user, info, role]);

  if (loading || !info) {
    return (
      <AuthLayout title="Parent invite" subtitle="Checking your invite…">
        <Spinner />
      </AuthLayout>
    );
  }

  if (!info.valid) {
    return (
      <AuthLayout title="Parent invite">
        <div className="space-y-4">
          <AuthMessage>{info.error || "This invite link isn't valid anymore. Ask your teen to send a new one."}</AuthMessage>
          <Button variant="outline" className="w-full h-12 font-medium" onClick={() => navigate("/")}>Go to Blockwork</Button>
        </div>
      </AuthLayout>
    );
  }

  if (user && ROLE_NAMES[role]) {
    return (
      <AuthLayout title="Sign in as a parent" subtitle={`${info.teenName} invited you to be their parent on Blockwork.`}>
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            You're signed in as a {ROLE_NAMES[role]} account. To link as a parent, sign out and continue with your own account.
          </p>
          <Button className="w-full h-12 font-medium" onClick={() => signOut(continueUrl)}>Sign out and continue</Button>
        </div>
      </AuthLayout>
    );
  }

  if (user) {
    return (
      <AuthLayout title="Parent invite" subtitle="Opening your invite…">
        <Spinner />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={`${info.teenName} invited you to be their parent on Blockwork.`}
      subtitle="Sign in or create a parent account to link with them and approve what they do."
    >
      <Button className="w-full h-12 font-medium" onClick={() => navigate(continueUrl)}>Continue</Button>
    </AuthLayout>
  );
}