import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, CreditCard, CheckCircle2, Star } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import Seo from "@/components/Seo";
import PublicFaq, { faqJsonLd, breadcrumbJsonLd } from "@/components/PublicFaq";

const FAQS = [
  { q: "How do I hire a teen on Blockwork?", a: "Browse verified teens near you by category and availability, or post a job describing what you need. You set the price and schedule; teens apply or accept. When you book, your payment is held in escrow until the work is done." },
  { q: "How does payment work?", a: "When you book, your payment is charged through Stripe and held safely in escrow. The teen does not get paid until you confirm the work is done. Your card details never touch Blockwork — they go straight to Stripe." },
  { q: "What if the work is not done right?", a: "After the teen marks the job done, you get a confirmation window to review the work. If something is wrong, you can dispute and our team reviews the situation. You can also file a dispute from the booking detail page." },
  { q: "Can a teen enter my home?", a: "No. All in-person work is performed outdoors on the exterior of your property, and all tutoring happens over video. Requesting a teen to enter your home is a violation of Blockwork's terms." },
];

const FAQ_JSONLD = faqJsonLd(FAQS);
const BREADCRUMB_JSONLD = breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Neighbor Guide", path: "/neighbor-guide" }]);

const STEPS = [
  {
    icon: Search,
    title: "Find a teen or post a job",
    body: "Browse verified teens near you by category and availability, or post a job describing what you need. You set the price and the schedule; teens apply or accept.",
  },
  {
    icon: CreditCard,
    title: "Pay securely up front",
    body: "When you book, your payment is held in escrow by Stripe — the teen doesn't get paid until the work is done. Your card details never touch Blockwork; they go straight to Stripe.",
  },
  {
    icon: CheckCircle2,
    title: "Approve the finished work",
    body: "After the teen marks the job done, you get a confirmation window to review the work. If it's good, the escrow releases. If something's wrong, you can dispute and our team reviews it.",
  },
  {
    icon: Star,
    title: "Leave a review",
    body: "Your rating helps other neighbors find reliable teens and helps the teen build their reputation. Honest reviews keep the marketplace trustworthy.",
  },
];

export default function NeighborGuide() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        title="Neighbor Guide"
        description="How to hire a teen on Blockwork: browse or post a job, pay securely through escrow, approve the finished work, and leave a review."
        path="/neighbor-guide"
        jsonLd={[FAQ_JSONLD, BREADCRUMB_JSONLD]}
      />
      <div className="flex-1 max-w-3xl mx-auto px-4 py-12 lg:py-20 w-full">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Blockwork
        </Link>
        <h1 className="text-2xl font-bold text-foreground mb-3">Neighbor Guide</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          Hiring a local teen through Blockwork is simple and protected. Here's how it works from your side.
        </p>
        <div className="space-y-4">
          {STEPS.map((s) => (
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
            Need help with a booking? Email{" "}
            <a href="mailto:support@blockwork.online" className="text-foreground font-medium hover:underline">support@blockwork.online</a>
            {" "}or read our{" "}
            <Link to="/refunds" className="text-foreground font-medium hover:underline">Refunds & Disputes</Link>
            {" "}policy.
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}