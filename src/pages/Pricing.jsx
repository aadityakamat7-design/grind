import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import Seo from "@/components/Seo";
import PublicFaq, { faqJsonLd, breadcrumbJsonLd } from "@/components/PublicFaq";

const FAQS = [
  { q: "How much does Blockwork cost?", a: "Blockwork is free to join and free to list. The only cost is a 12.9% + $0.30 platform fee per completed job, deducted from the total the neighbor pays. There are no signup fees, monthly subscriptions, or listing fees." },
  { q: "How do tips work on Blockwork?", a: "Neighbors can add an optional tip after a job well done. Tips are processed separately with a 3.5% + $0.50 fee to cover Stripe's processing cost, and the full net tip amount goes to the teen." },
  { q: "When does Blockwork get paid?", a: "Blockwork only earns money when a job is actually completed. The platform fee is deducted from the escrow payment when it is released to the teen's parent." },
  { q: "Are there any hidden fees?", a: "No. The 12.9% + $0.30 fee is the only charge. There are no signup fees, subscription costs, or listing fees — ever." },
];

const FAQ_JSONLD = faqJsonLd(FAQS);
const BREADCRUMB_JSONLD = breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Pricing", path: "/pricing" }]);

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        title="Pricing"
        description="Blockwork's simple, transparent pricing: a 12.9% + $0.30 platform fee per completed job. No signup fees, no subscriptions, no hidden charges."
        path="/pricing"
        jsonLd={[FAQ_JSONLD, BREADCRUMB_JSONLD]}
      />
      <div className="flex-1 max-w-3xl mx-auto px-4 py-12 lg:py-20 w-full">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Blockwork
        </Link>
        <h1 className="text-2xl font-bold text-foreground mb-3">Pricing</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          Blockwork is free to join and free to list. We only earn money when a job is actually completed — a single transparent fee per transaction.
        </p>

        <div className="bg-card rounded-2xl border border-border shadow-soft p-6 mb-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-2">Platform fee</p>
          <p className="text-4xl font-bold text-foreground">12.9% <span className="text-lg font-normal text-muted-foreground">+ $0.30</span></p>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            Charged per completed job, deducted from the total the neighbor pays. The rest goes to the teen (through their parent's connected bank account). There are no signup fees, monthly subscriptions, or listing fees — ever.
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-soft p-6 mb-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-3">Example</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Neighbor pays</span><span className="font-medium text-foreground">$40.00</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Platform fee (12.9% + $0.30)</span><span className="font-medium text-foreground">−$5.46</span></div>
            <div className="flex justify-between pt-2 border-t border-border"><span className="font-semibold text-foreground">Teen earns</span><span className="font-bold text-foreground">$34.54</span></div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-soft p-6 mb-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-3">Tips</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Neighbors can add an optional tip after a job well done. Tips are processed separately with a 3.5% + $0.50 fee to cover Stripe's processing cost, and the full net tip amount goes to the teen.
          </p>
        </div>

        <PublicFaq faqs={FAQS} />

        <div className="bg-secondary border border-border rounded-2xl p-5">
          <p className="text-sm text-muted-foreground leading-relaxed">
            All payments are processed by Stripe and held in escrow until the job is confirmed complete. Read our{" "}
            <Link to="/refunds" className="text-foreground font-medium hover:underline">Refunds & Disputes</Link>
            {" "}policy or the full{" "}
            <Link to="/compliance" className="text-foreground font-medium hover:underline">Payments & Compliance</Link>
            {" "}details.
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}