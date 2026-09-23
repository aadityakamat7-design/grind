import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldAlert, Phone, Mail, MessageSquare } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import Seo from "@/components/Seo";

export default function ReportSafetyConcern() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        title="Report a Safety Concern"
        description="Report a safety concern on Blockwork. For emergencies call 911. For urgent in-app issues use Alert parent or Report. For all other concerns, email our team."
        path="/report-safety"
      />
      <div className="flex-1 max-w-2xl mx-auto px-4 py-12 lg:py-20 w-full">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Blockwork
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Report a Safety Concern</h1>
        </div>

        <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Emergency?</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                If someone is in immediate danger, call <span className="font-bold text-foreground">911</span> first. Blockwork's reporting tools are not a substitute for emergency services.
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          We take every safety concern seriously. Choose the fastest way to reach us based on your situation:
        </p>

        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
            <div className="flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">During an active job</p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Use the <span className="font-medium text-foreground">Alert parent</span> button (teens) or the <span className="font-medium text-foreground">Report</span> button (anyone) inside the booking or chat. This notifies the parent and our team immediately.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Any other concern</p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Email{" "}
                  <a href="mailto:support@blockwork.online" className="text-foreground font-medium hover:underline">support@blockwork.online</a>
                  {" "}with the details. Include the booking ID if you have one. We respond within 24 hours and review every report.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-secondary border border-border rounded-2xl p-5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            What happens next: our team reviews the report, may contact you and the other party for more information, and takes action ranging from a warning to a permanent ban. Retaliation against anyone who reports a concern in good faith is strictly prohibited.
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}