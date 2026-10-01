import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import BlockworkLogo from "@/components/BlockworkLogo";
import { callAccountFunction } from "@/lib/accountApi";

// Where the "confirm your new email" link lands. Works signed in or out — the
// one-time token in the link is the credential. Nothing changes until this runs.
export default function AccountEmailConfirm() {
  const [state, setState] = useState("working");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const token = new URLSearchParams(window.location.search).get("token") || "";
    (async () => {
      try {
        const res = await callAccountFunction("accountEmail", { action: "confirm", token });
        setEmail(res?.email || "");
        setState("done");
      } catch (err) {
        setMessage(err.message);
        setState("error");
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-card p-6 space-y-4 text-center">
        <Link to="/" className="inline-flex items-center gap-2">
          <BlockworkLogo size={30} />
          <span className="font-extrabold text-[18px] text-foreground">Blockwork</span>
        </Link>

        {state === "working" && (
          <>
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Confirming your email…</p>
          </>
        )}

        {state === "done" && (
          <>
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h1 className="font-bold text-lg text-foreground">Email confirmed</h1>
            <p className="text-sm text-muted-foreground">
              {email ? <>Blockwork now uses <span className="font-semibold text-foreground">{email}</span>.</> : "Your email is updated."}{" "}
              We've sent a notice to your old address so you'd know.
            </p>
            <Link to="/account" className="inline-flex w-full items-center justify-center h-11 rounded-full bg-primary text-primary-foreground font-semibold">
              Go to my account
            </Link>
          </>
        )}

        {state === "error" && (
          <>
            <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
            <h1 className="font-bold text-lg text-foreground">We couldn't confirm that</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Link to="/account" className="inline-flex w-full items-center justify-center h-11 rounded-full border border-border font-semibold text-foreground">
              Back to my account
            </Link>
            <p className="text-[12px] text-muted-foreground">
              Stuck? <Link to="/support" className="text-primary font-semibold hover:underline">Contact support</Link>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}