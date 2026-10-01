import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import BlockworkLogo from "@/components/BlockworkLogo";
import { callAccountFunction } from "@/lib/accountApi";

// Where the "this wasn't me" link in a change notice lands. It reports the
// change straight away — the token is one-time, and no sign-in is needed —
// then tells the person what to do next.
export default function AccountAlert() {
  const [state, setState] = useState("working");
  const [message, setMessage] = useState("");
  const [already, setAlready] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const token = new URLSearchParams(window.location.search).get("token") || "";
    (async () => {
      try {
        const res = await callAccountFunction("reportAccountAlert", { token });
        setAlready(!!res?.already_reported);
        setState("done");
      } catch (err) {
        setMessage(err.message);
        setState("error");
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-card p-6 space-y-4">
        <Link to="/" className="inline-flex items-center gap-2">
          <BlockworkLogo size={30} />
          <span className="font-extrabold text-[18px] text-foreground">Blockwork</span>
        </Link>

        {state === "working" && (
          <div className="text-center space-y-3 py-2">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Filing your report…</p>
          </div>
        )}

        {state === "done" && (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <h1 className="font-bold text-lg text-foreground">
                  {already ? "We already have your report" : "Reported — thank you"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Our safety team has been alerted and will look at your account right away.
                </p>
              </div>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3.5 space-y-1.5">
              <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> Do these two things now
              </p>
              <p className="text-[12px] text-amber-700/90">
                1. Change your password — if someone else has it, changing it locks them out.
              </p>
              <p className="text-[12px] text-amber-700/90">
                2. Check your payout details on the Payouts screen.
              </p>
            </div>
            <div className="grid gap-2.5">
              <Link to="/forgot-password" className="inline-flex w-full items-center justify-center h-11 rounded-full bg-primary text-primary-foreground font-semibold">
                Change my password
              </Link>
              <Link to="/support" className="inline-flex w-full items-center justify-center h-11 rounded-full border border-border font-semibold text-foreground">
                Talk to support
              </Link>
            </div>
          </div>
        )}

        {state === "error" && (
          <div className="space-y-3 text-center">
            <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
            <h1 className="font-bold text-lg text-foreground">We couldn't file that automatically</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Link to="/support" className="inline-flex w-full items-center justify-center h-11 rounded-full bg-primary text-primary-foreground font-semibold">
              Contact support now
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}