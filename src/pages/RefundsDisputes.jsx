import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Clock, AlertTriangle, Scale } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import Seo from "@/components/Seo";
import PublicFaq, { faqJsonLd, breadcrumbJsonLd } from "@/components/PublicFaq";

const FAQS = [
  { q: "How does escrow work on Blockwork?", a: "When you pay for a booking, the money is held by Stripe in escrow — the teen is not paid until the work is confirmed done. This protects both sides: your money is safe if the teen does not show up, and the teen is guaranteed payment if they complete the work." },
  { q: "How long do I have to confirm the work?", a: "After the teen marks a job complete, you have a confirmation window to review the work. If you do nothing, the payment releases automatically after the window closes." },
  { q: "How do I file a dispute?", a: "If the work was not done or was not done correctly, you can dispute the booking from the booking detail page. The escrow is held while our team reviews the situation. Both sides can provide their account of what happened." },
  { q: "How are disputes resolved?", a: "Our team reviews the booking details, completion photos, messages, and any evidence from both sides. We release the funds to the teen if the work was completed as agreed, or refund the neighbor if it was not. Decisions are communicated to both parties." },
];

const FAQ_JSONLD = faqJsonLd(FAQS);
const BREADCRUMB_JSONLD = breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Refunds & Disputes", path: "/refunds" }]);

const SECTIONS = [
  {
    icon: ShieldCheck,
    title: "Escrow protection",
    body: "When a neighbor pays for a booking, the money is held by Stripe in escrow — the teen is not paid until the work is confirmed done. This protects both sides: the neighbor's money is safe if the teen doesn't show up, and the teen is guaranteed payment if they complete the work.",
  },
  {
    icon: Clock,
    title: "Confirmation window",
    body: "After the teen marks a job complete, the neighbor has a confirmation window to review the work. If the work was done correctly, the neighbor confirms and the escrow releases to the teen's parent's bank account. If the neighbor does nothing, the payment releases automatically after the window closes.",
  },
  {
    icon: AlertTriangle,
    title: "Filing a dispute",
    body: "If the work wasn't done or wasn't done correctly, the neighbor can dispute the booking from the booking detail page. The escrow is held while our team reviews the situation. Both the neighbor and the teen (and their parent) can provide their account of what happened.",
  },
  {
    icon: Scale,
    title: "How we resolve disputes",
    body: "Our team reviews the booking details, completion photos, messages, and any evidence from both sides. We release the funds to the teen if the work was completed as agreed, or refund the neighbor if it wasn't. Decisions are communicated to both parties.",
  },
];

export default function RefundsDisputes() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        title="Refunds & Disputes"
        description="How Blockwork handles refunds, escrow, and disputes: confirmation windows, how to file a dispute, and how our team resolves them fairly."
        path="/refunds"
        jsonLd={[FAQ_JSONLD, BREADCRUMB_JSONLD]}
      />
      <div className="flex-1 max-w-3xl mx-auto px-4 py-12 lg:py-20 w-full">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Blockwork
        </Link>
        <h1 className="text-2xl font-bold text-foreground mb-3">Refunds & Disputes</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          Every booking on Blockwork is protected by escrow. Here's how refunds and disputes work if something goes wrong.
        </p>
        <div className="space-y-4">
          {SECTIONS.map((s) => (
            <div key={s.title} className="bg-card rounded-2xl border border-border shadow-soft p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground text-sm">{s.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{s.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <PublicFaq faqs={FAQS} />

        <div className="mt-8 bg-secondary border border-border rounded-2xl p-5">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Need to file a dispute or have a question about a refund? Email{" "}
            <a href="mailto:support@blockwork.online" className="text-foreground font-medium hover:underline">support@blockwork.online</a>
            {" "}or use the Report button inside any booking.
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}