import React from "react";
import { Link } from "react-router-dom";
import { HelpCircle, ArrowLeft } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import Seo from "@/components/Seo";

const FAQS = [
  {
    q: "How do teens get paid?",
    a: "When a neighbor books a job, their payment is charged through Stripe and held safely in escrow. The teen does the work, uploads photo proof, and the neighbor confirms it's done. Only then is the money released to the teen's parent, who receives it in their connected Stripe Connect account. The teen's share appears in their in-app Blockwork Wallet, and the parent can distribute the earnings to the teen as they see fit.",
  },
  {
    q: "Is it safe to hire a teenager on Blockwork?",
    a: "Blockwork is built around safety. Every parent verifies their identity with a government ID before their teen can accept a first job, and teens verify the first time they accept work. A parent must approve every booking before it's confirmed. All in-person work happens outdoors — teens never enter a client's home — and all tutoring happens over video. Messages are monitored for attempts to share contact info before a booking is confirmed, and a teen can alert their parent instantly from any active job.",
  },
  {
    q: "How much can a teen earn doing yard work?",
    a: "Teens set their own prices, and neighbors pay a fraction of what professional services charge. A typical lawn mowing or yard cleanup might pay $25–$60, and online tutoring often ranges from $15–$40 per session. Teens keep the majority of each payment; Blockwork takes a small service fee that's shown upfront at checkout. There's no limit on how many jobs a teen can take, subject to California work-hour limits for minors.",
  },
  {
    q: "Do teens need a work permit?",
    a: "No. The casual, irregular odd jobs offered on Blockwork — light outdoor tasks and online tutoring — are exempt from California's work-permit requirement under the state's odd-jobs exemption for irregular casual work in private homes. However, that exemption does not remove California's child-labor hour limits or minimum-age rules, which Blockwork enforces automatically at booking. Limits vary by the teen's age, including daily and weekly caps and prohibited time windows. Parents are responsible for monitoring their teen's total hours, including any work done outside the platform. (Blockwork currently operates in California only.)",
  },
  {
    q: "How does parent approval work?",
    a: "No job is confirmed without a parent's explicit approval. When a teen accepts or receives a booking request, the parent sees the job details, the neighbor's name, the location, and the pay before saying yes. A parent can deny any booking at any time before it starts. The parent is the legal and financial account holder: they connect the bank account, receive the payouts, and can revoke consent at any time, which immediately suspends the teen's profile.",
  },
  {
    q: "What kinds of jobs can teens do on Blockwork?",
    a: "Two categories only: outdoor tasks performed entirely outside a residence (lawn mowing, leaf raking, yard cleanup, car washing, snow shoveling, and similar light odd jobs), and online tutoring and tech help conducted over video. Anything that requires entering a home, involves heavy machinery, childcare, transportation, or hazardous equipment is not permitted.",
  },
  {
    q: "Can a teen enter my home to do the work?",
    a: "No — never. This is a core safety rule. All in-person work is performed outdoors on the exterior of the property, and all tutoring happens remotely over video. Requesting or allowing a teen to enter a residence for any reason is a material violation of our terms and grounds for immediate account termination.",
  },
  {
    q: "How old do teens need to be to use Blockwork?",
    a: "Teens must be at least 13 years old. Users under 13 are not permitted. Teens aged 13–17 need a parent or guardian linked to their account, verified and consenting, before they can accept jobs or receive payments. Teens who are 18 or older may use the platform independently.",
  },
];

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function Faq() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        title="FAQ"
        description="Answers to common Blockwork questions: how teens get paid, safety, what teens can earn, work permits, and how parent approval works."
        path="/faq"
        jsonLd={FAQ_JSONLD}
      />
      <div className="flex-1 max-w-3xl mx-auto px-4 py-12 lg:py-20 w-full">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Blockwork
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-card">
            <HelpCircle className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Frequently asked questions</h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          Everything people ask before joining Blockwork — how teens get paid, how we keep things safe, and what the rules are. Don't see your question? <Link to="/support" className="text-foreground font-medium hover:underline">Reach out to our team</Link>.
        </p>
        <div className="space-y-4">
          {FAQS.map((f) => (
            <div key={f.q} className="bg-card rounded-2xl border border-border shadow-soft p-5">
              <h2 className="font-bold text-foreground text-sm">{f.q}</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}