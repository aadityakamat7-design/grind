import React from "react";
import { Link } from "react-router-dom";
import { LifeBuoy, Mail, ArrowLeft, ShieldAlert } from "lucide-react";

export default function Support() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12 lg:py-20">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to KickStart
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-foreground flex items-center justify-center">
            <LifeBuoy className="w-6 h-6 text-background" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Support</h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          We're here to help. If you have a question about a booking, a payment, or a safety concern, reach out and our team will get back to you.
        </p>
        <div className="bg-card rounded-2xl border border-border shadow-soft p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Email us</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {/* [REVIEW: owner to set — replace with the monitored support email address] */}
                <a href="mailto:support@kickstart.example" className="text-foreground font-medium hover:underline">support@kickstart.example</a>
              </p>
              <p className="text-xs text-muted-foreground mt-1">This is a placeholder — replace with your monitored support email.</p>
            </div>
          </div>
        </div>
        <div className="mt-6 flex items-start gap-3 bg-secondary border border-border rounded-2xl p-4">
          <ShieldAlert className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            For urgent safety concerns during an active job, use the "Alert parent" or "Report" buttons directly in the booking or chat. For emergencies, call 911.
          </p>
        </div>
      </div>
    </div>
  );
}