import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Wallet, Eye, Bell, Lock } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import Seo from "@/components/Seo";
import PublicFaq, { faqJsonLd, breadcrumbJsonLd } from "@/components/PublicFaq";

const FAQS = [
  { q: "How does parent approval work on Blockwork?", a: "Your teen can't post a service or take a job until you're linked to their account, and nothing goes ahead without your approval. A service they post stays hidden from neighbors until you approve it, and when a neighbor books them you see the job details, address, pay, and neighbor's name before saying yes. You can deny any booking at any time before it starts." },
  { q: "How does my teen get paid?", a: "Because your teen is a minor, their earnings flow through a Stripe Connect account in your name. After each completed job, the teen's share lands in your connected bank account. Your teen sees their balance in their Blockwork Wallet but cannot cash out without your account." },
  { q: "Can I lock my teen's withdrawals?", a: "Yes. From your dashboard you can freeze your teen's ability to cash out at any time, for any reason. The earnings stay safe until you unlock it." },
  { q: "What is a Blockwork Work Record?", a: "Every job your teen completes and gets paid for builds a verified Work Record — dates, categories, hours, their average rating, and review quotes. They can download it as a PDF for college applications, résumés, and job applications, or share a verification link a school or employer can open. Nothing on it is typed in by hand: it only reflects completed, paid-out jobs, and every job on it was approved by you. It's verified by Blockwork — experience they can list under activities or work experience. Your teen or you can turn the public verification link off at any time." },
  { q: "How do I know my teen got there and got home safely?", a: "Your teen taps \"I'm here\" when they arrive and \"Done, heading home\" when they leave, and you get a notification each time (marked \"Location not confirmed\" if their phone's location wasn't available — they're never blocked from checking in). If they haven't checked in 15 minutes after the start time, or haven't checked out 30 minutes after the scheduled end, you're alerted. During an active job they also have an SOS button — held for two seconds so it can't go off by accident — which alerts you and our safety team with their location and the job details and puts a call-911 button in front of them. We never call 911 for them." },
  { q: "Can I set limits on when and how much my teen works?", a: "Yes. In your dashboard you can set, for each teen, a weekly hour cap, which days they may work, the earliest and latest hours, \"no jobs on school nights\" (Sunday–Thursday after 6 PM), and how far from home they may work. Blockwork enforces these on the server whenever a booking is made or a job is accepted, and always applies whichever limit is tighter — yours or California's child-labor limits. Neighbors only see \"Not available at that time\"; your teen sees exactly which limit they hit." },
  { q: "Are my teen's messages checked?", a: "Every message is screened automatically before it's delivered — our own safety rules plus a third-party moderation service (OpenAI). Contact details and payment apps are hidden, risky messages that ask to meet elsewhere or ask personal questions about your teen are held for our safety team, and anything sexual, threatening, or secretive is blocked, with our team alerted immediately. You see every flagged message involving your teen, and what happened to it, on your dashboard. If your teen ever writes something about self-harm, that isn't treated as misbehavior — they're shown the 988 Suicide & Crisis Lifeline, our team is alerted, and we decide the next step rather than notifying you automatically." },
  { q: "What do I need to set up?", a: "Just your teen's connection code to start. You'll enter your legal name and date of birth, confirm you're your teen's parent or legal guardian, and confirm their date of birth — that's all linking takes, and no bank account is needed for it. Before your teen's first cash-out you'll set up a payout account through Stripe, which checks your legal name, date of birth, and Social Security number to confirm you're an adult and connects your bank account for their earnings. Until that account is active, your teen's earnings stay held in their wallet." },
];

const FAQ_JSONLD = faqJsonLd(FAQS);
const BREADCRUMB_JSONLD = breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Parent Guide", path: "/parent-guide" }]);

const STEPS = [
  {
    icon: ShieldCheck,
    title: "Link with your teen's code",
    body: "Your teen shares a connection code from their app. You enter it with your legal name and date of birth, confirm you're their parent or legal guardian, and confirm their date of birth. The link is active right away — no bank account needed. From then on your teen can post services and take jobs, and you approve each one.",
  },
  {
    icon: Eye,
    title: "Approve every service and every job",
    body: "A service your teen posts is hidden from neighbors until you approve it, and a booking isn't confirmed until you approve that too. You see the job details, the address, the pay, and the neighbor's name before you say yes. Nothing happens until you approve.",
  },
  {
    icon: Wallet,
    title: "Set up payouts before the first cash-out",
    body: "Your teen's earnings build up in their Blockwork Wallet as they work, and they stay held there until you set up a payout account. When your teen tries to cash out without one, we email you with a link to start. Stripe confirms you're an adult by checking your legal name, date of birth, and Social Security number, and connects the bank account their earnings are paid into. You connect a bank account once; after each completed job, the teen's share lands there.",
  },
  {
    icon: Lock,
    title: "Lock withdrawals anytime",
    body: "From your dashboard you can freeze your teen's ability to cash out at any time, for any reason. The earnings stay safe until you unlock it.",
  },
  {
    icon: Bell,
    title: "Check-ins, limits, and message screening",
    body: "Your teen taps \"I'm here\" when they arrive and \"Done, heading home\" when they leave — you're notified each time, and alerted if a check-in is missed or a job runs late. You can set your own limits per teen (hours per week, allowed days and times, no school nights, how far from home), and Blockwork always applies whichever is tighter, yours or the law's. Every message is screened before delivery: contact details are hidden, risky messages are held or blocked, and you see what was flagged on your dashboard. During an active job your teen has an SOS button that alerts you and our safety team immediately.",
  },
  {
    icon: Bell,
    title: "Turn work into a record",
    body: "Every completed, paid job goes onto your teen's Blockwork Work Record — a verified history they can download as a PDF or share as a verification link for college applications, résumés, and job applications. Nothing is typed in by hand, and you can turn the public link off at any time.",
  },
];

export default function ParentGuide() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        title="Parent Guide"
        description="How Blockwork works for parents: payout account setup, booking approval, payouts, withdrawal locks, and safety notifications."
        path="/parent-guide"
        jsonLd={[FAQ_JSONLD, BREADCRUMB_JSONLD]}
      />
      <div className="flex-1 max-w-3xl mx-auto px-4 py-12 lg:py-20 w-full">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Blockwork
        </Link>
        <h1 className="text-2xl font-bold text-foreground mb-3">Parent Guide</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          You're the legal and financial account holder for your teen's work on Blockwork. Here's exactly what that means, what you control, and what happens at each step.
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
            Questions? Email{" "}
            <a href="mailto:support@blockwork.online" className="text-foreground font-medium hover:underline">support@blockwork.online</a>
            {" "}or visit our{" "}
            <Link to="/safety" className="text-foreground font-medium hover:underline">Safety Center</Link>.
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}