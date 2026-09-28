import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, MailX } from "lucide-react";
import Seo from "@/components/Seo";
import SiteFooter from "@/components/SiteFooter";

// One-click unsubscribe page. Reached from the unsubscribe link in marketing
// emails. Calls the unsubscribeEmail backend function with the email from the
// query string, which sets marketing_emails_unsubscribed = true on the user.
// Takes effect immediately. Transactional emails are not affected.

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const email = params.get("email") || "";
  const [status, setStatus] = useState("loading"); // loading | done | error
  const [unsubscribing, setUnsubscribing] = useState(false);

  const doUnsubscribe = async () => {
    setUnsubscribing(true);
    try {
      await base44.functions.invoke("unsubscribeEmail", { email });
      setStatus("done");
    } catch (e) {
      setStatus("error");
    } finally {
      setUnsubscribing(false);
    }
  };

  // Auto-unsubscribe on load if email is present
  useEffect(() => {
    if (!email) {
      setStatus("error");
      return;
    }
    doUnsubscribe();
  }, [email]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo title="Unsubscribe" description="Unsubscribe from Blockwork marketing emails." path="/unsubscribe" noindex />
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-md w-full text-center space-y-4">
          {status === "loading" || unsubscribing ? (
            <>
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
              <h1 className="text-xl font-heading font-bold text-foreground">Unsubscribing…</h1>
              <p className="text-sm text-muted-foreground">Processing your unsubscribe request.</p>
            </>
          ) : status === "done" ? (
            <>
              <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <h1 className="text-xl font-heading font-bold text-foreground">You're unsubscribed</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You won't receive marketing emails from Blockwork anymore. This takes effect immediately.
                Transactional emails — receipts, booking and approval notices, and security emails — are not affected.
              </p>
              <Link to="/">
                <Button variant="outline" className="mt-2">Back to home</Button>
              </Link>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <MailX className="w-8 h-8 text-destructive" />
              </div>
              <h1 className="text-xl font-heading font-bold text-foreground">Something went wrong</h1>
              <p className="text-sm text-muted-foreground">
                We couldn't process your unsubscribe request. Please email{" "}
                <a href="mailto:support@blockwork.online" className="text-primary hover:underline">support@blockwork.online</a>{" "}
                and we'll unsubscribe you manually.
              </p>
              <Link to="/">
                <Button variant="outline" className="mt-2">Back to home</Button>
              </Link>
            </>
          )}
        </div>
      </div>
      <SiteFooter compact />
    </div>
  );
}