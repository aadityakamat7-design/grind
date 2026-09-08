import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Heart, Target, Users, X, ShieldCheck } from "lucide-react";
import BlockworkLogo from "@/components/BlockworkLogo";
import SiteFooter from "@/components/SiteFooter";
import Seo from "@/components/Seo";

const DONT = [
  "We never ask for payment to sign up or to get work — creating an account and finding jobs is always free.",
  "We never ask for your Social Security number — Stripe collects identity information directly for payout verification, not Blockwork.",
  "We never store card or bank details — all payment information goes straight to Stripe's PCI-compliant infrastructure.",
  "Teens never enter a client's home — all in-person work is outdoors, all tutoring is over video.",
];

export default function About() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        title="About"
        description="Blockwork is a parent-approved marketplace built in California by a small team of parents and technologists. Learn who built it, why, and what it does — and doesn't — do."
        path="/about"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: "About Blockwork",
          description: "Who built Blockwork, why, and what the platform does and doesn't do.",
        }}
      />
      <div className="flex-1 max-w-3xl mx-auto px-4 py-12 lg:py-20 w-full">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Blockwork
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <BlockworkLogo size={48} />
          <h1 className="text-2xl font-bold text-foreground">About Blockwork</h1>
        </div>

        {/* Founding story */}
        <div className="mb-8">
          <h2 className="font-bold text-foreground text-lg mb-3">Why we built this</h2>
          <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
            <p>
              Blockwork was started in Fremont, California by a parent who wanted a safer way for their teenager to earn money. The existing options weren't good enough — Craigslist is anonymous, Facebook Marketplace has no protections, and adult gig platforms like TaskRabbit aren't built for minors. Meanwhile, neighbors were already asking in community groups for a reliable teen to mow a lawn, walk a dog, or help with homework.
            </p>
            <p>
              The idea was simple: build a marketplace where every job is approved by a parent, every user is verified, and every payment is protected by escrow. No teen walks into a stranger's home. No neighbor gets ghosted. No parent has to wonder where their kid is or whether they'll get paid.
            </p>
            <p>
              We started in California because the state has clear, specific child-labor rules we could build into the platform itself — age minimums, hour limits, and hazard restrictions. Instead of relying on people to read the fine print, Blockwork enforces those rules automatically at booking. We'll expand to other states as we can meet their requirements with the same rigor.
            </p>
          </div>
        </div>

        {/* Mission / who it's for / how it works */}
        <div className="space-y-4 mb-8">
          <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-foreground text-sm">Our mission</h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  To give every teen a safe, supported way to earn their first dollar — and every neighbor a trusted way to get help with the jobs they don't have time for.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-foreground text-sm">Who it's for</h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Teens (13+) who want to earn money doing things they're good at — tutoring, lawn care, pet sitting, tech help, and more. Parents who want visibility and control over their teen's work. And neighbors who need a reliable local hand.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-soft p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-foreground text-sm">How it works</h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Teens create listings for services they offer. Neighbors post jobs or browse service listings. When a teen accepts a job, their parent approves it. Payment is held in escrow until the job is done, then released to the parent's connected bank account. The teen earns money in their Blockwork Wallet.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* What we don't do */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-success" />
            <h2 className="font-bold text-foreground text-lg">What we don't do</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            Being explicit about what we don't do is one of the strongest ways we can prove this isn't a scam. Here's what Blockwork will never do:
          </p>
          <div className="space-y-3">
            {DONT.map((item) => (
              <div key={item} className="flex items-start gap-3 bg-card rounded-xl border border-border p-4">
                <span className="w-5 h-5 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                  <X className="w-3 h-3 text-destructive" />
                </span>
                <p className="text-sm text-foreground/90 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Who runs it */}
        <div className="bg-secondary border border-border rounded-2xl p-5">
          <h2 className="font-bold text-foreground text-sm mb-2">Who runs Blockwork</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Blockwork is built and operated by a small team based in California. We're parents and technologists who care about doing this right. If you have questions, concerns, or ideas, email us at{" "}
            <a href="mailto:support@blockwork.online" className="text-foreground font-medium hover:underline">support@blockwork.online</a>
            {" "}— we respond within 24 hours.
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}