import React from "react";
import { Link } from "react-router-dom";
import { HelpCircle, ArrowLeft } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import Seo from "@/components/Seo";
import { breadcrumbJsonLd } from "@/components/PublicFaq";

const BREADCRUMB_JSONLD = breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "FAQ", path: "/faq" }]);

const FAQS = [
  {
    q: "How do teens get paid?",
    a: "When a neighbor books a job, their payment is charged through Stripe and held safely until the job is done. The teen does the work, uploads photo proof, and the neighbor confirms it's done. Only then is the money released to the teen's parent, who receives it in their connected Stripe Connect account — the parent sets that account up before the teen's first cash-out, and earnings stay held in the teen's Blockwork Wallet until it's ready. The parent can distribute the earnings to the teen as they see fit.",
  },
  {
    q: "What is a Blockwork Work Record?",
    a: "Every job a teen completes and gets paid for is added to their Work Record — a verified history of the work they've actually done, with dates, categories, hours, average rating, and review quotes. Teens and their parents can download it as a PDF for college applications, résumés, and job applications, or share a verification link a school or employer can open to confirm it's real. Nothing on it is typed in by hand: it only reflects completed, paid-out jobs, and every job on it was approved by a parent. It's verified by Blockwork — it's experience a student can list under activities or work experience. The verification link can be turned off at any time.",
  },
  {
    q: "Is it safe to hire a teenager on Blockwork?",
    a: "Blockwork is built around safety. A parent must link to their teen's account before the teen can post a service or take a job, and the parent approves every service and every booking before it goes ahead. Before any earnings can be paid out, the parent sets up a payout account through Stripe, which confirms they're a real adult. All in-person work happens outdoors — teens never enter a client's home — and all tutoring happens over video. Every message is screened automatically before it's delivered — messages are checked for contact details, off-platform payment requests, meeting-elsewhere requests and anything inappropriate, the risky ones are held or blocked, and the teen's parent sees what was flagged. A teen taps \"I'm here\" when they arrive and \"Done, heading home\" when they leave, so their parent knows they arrived and is on their way, and a teen can alert their parent instantly with the SOS button during any active job.",
  },
  {
    q: "How much can a teen earn doing yard work?",
    a: "Teens set their own prices, and neighbors pay a fraction of what professional services charge. A typical lawn mowing or yard cleanup might pay $25–$60, and online tutoring often ranges from $15–$40 per session. Teens keep the majority of each payment; Blockwork takes a small service fee that's shown upfront at checkout. There's no limit on how many jobs a teen can take, subject to California work-hour limits for minors.",
  },
  {
    q: "Do teens need a work permit?",
    a: "Generally, no. The casual, irregular odd jobs offered on Blockwork — light outdoor tasks and online tutoring — are generally exempt from California's work-permit requirement under the state's odd-jobs exemption for irregular casual work in private homes, as described in the California DIR Child Labor Law Pamphlet (dir.ca.gov/dlse). However, parents and teens remain responsible for confirming any permit requirements applicable to their situation — Blockwork does not determine permit eligibility. This exemption does not remove California's child-labor hour limits or minimum-age rules, which Blockwork enforces automatically at booking. Limits vary by the teen's age, including daily and weekly caps and prohibited time windows. Parents are responsible for monitoring their teen's total hours, including any work done outside the platform. (Blockwork currently operates in California only.)",
  },
  {
    q: "How does parent approval work?",
    a: "No service is published and no job is confirmed without a parent's explicit approval. A service a teen posts stays hidden from neighbors until the parent approves it, and a job can't be confirmed until the parent approves the booking. When a teen accepts or receives a booking request, the parent sees the job details, the neighbor's name, the location, and the pay before saying yes. A parent can deny any booking at any time before it starts. The parent is the legal and financial account holder: they connect the bank account, receive the payouts, and can revoke consent at any time, which immediately suspends the teen's profile.",
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
    a: "Teens must be at least 13 years old. Users under 13 are not permitted. Teens aged 13–17 need a parent or guardian linked to their account, and consenting, before they can post services or accept jobs; the parent approves each one. Teens who are 18 or older may use the platform independently.",
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
        jsonLd={[FAQ_JSONLD, BREADCRUMB_JSONLD]}
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
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Everything people ask before joining Blockwork — how teens get paid, how we keep things safe, and what the rules are. Don't see your question? <Link to="/support" className="text-foreground font-medium hover:underline">Reach out to our team</Link>.
        </p>
        <p className="text-xs text-muted-foreground bg-muted rounded-xl p-3 border border-border mb-8">
          <strong className="text-foreground">California only.</strong> Blockwork currently operates only in California. All services and rules described here apply solely to California residents.
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