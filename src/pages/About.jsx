import React from "react";
import { Link } from "react-router-dom";
import { Zap, ArrowLeft, Heart, Target, Users } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import Seo from "@/components/Seo";

export default function About() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo title="About" description="A secure, parent-monitored marketplace where neighborhood teens find local work and adults get reliable help with outdoor tasks and online tutoring." path="/about" />
      <div className="flex-1 max-w-3xl mx-auto px-4 py-12 lg:py-20 w-full">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Blockwork
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-md">
            <Zap className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">About Blockwork</h1>
        </div>

        <p className="text-base text-foreground leading-relaxed mb-6">
          Blockwork is a secure, parent-monitored marketplace where California teens find local work and adults get reliable help. We believe a first job should teach responsibility, build confidence, and put real money in a teen's pocket — all inside a system that keeps them safe. Blockwork is currently available in California only — we're starting here and expanding soon.
        </p>

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

      </div>
      <SiteFooter />
    </div>
  );
}