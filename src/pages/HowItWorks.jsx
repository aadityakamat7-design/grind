import React from "react";
import { Link } from "react-router-dom";
import { ListChecks, ArrowLeft, UserCheck, ShieldCheck, CreditCard, Wallet, Star, Award } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import Seo from "@/components/Seo";

const STEPS = [
  {
    icon: ListChecks,
    title: "1. List or post a job",
    body: "Teens create listings for services they offer — lawn care, car washing, pet sitting, tech help, or online tutoring — and set their own prices. Neighbors can also post a specific job and let teens apply. Listings are screened for safety hazards before they go live.",
  },
  {
    icon: UserCheck,
    title: "2. Match and book",
    body: "Neighbors browse nearby services by category, rating, and distance, or a teen accepts a posted job. For outdoor work, the address stays hidden until the booking is confirmed. For online tutoring, a video session link is generated automatically.",
  },
  {
    icon: ShieldCheck,
    title: "3. Parent approves",
    body: "No job is confirmed without the teen's parent reviewing the details — the neighbor's name, the location, the pay, and the schedule — and explicitly saying yes. A parent can deny any booking at any time before it starts.",
  },
  {
    icon: CreditCard,
    title: "4. Payment is held",
    body: "When the job starts, the neighbor's payment (plus any tip) is charged through Stripe and held safely until the job is done. The teen does the work and uploads photo proof that it's complete.",
  },
  {
    icon: Star,
    title: "5. Neighbor confirms",
    body: "The neighbor reviews the photos and confirms the work is done. If something's wrong, they can report it and the payment is held for review. Once confirmed, the funds are released — no chasing invoices, no awkward reminders.",
  },
  {
    icon: Award,
    title: "7. The work adds up",
    body: "Every completed, paid job goes onto the teen's Blockwork Work Record — a verified history with dates, hours, categories, ratings and review quotes, downloadable as a PDF or shareable as a verification link for college applications, résumés, and job applications. Nothing on it is typed in by hand, and it can be turned off at any time.",
  },
];

const BREADCRUMB_JSONLD = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://blockwork.online/" },
    { "@type": "ListItem", position: 2, name: "How it works", item: "https://blockwork.online/how-it-works" },
  ],
};

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        title="How it works"
        description="The full Blockwork flow: teens list services, neighbors book, parents approve, payment is held until done, and earnings land in the teen's wallet."
        path="/how-it-works"
        jsonLd={BREADCRUMB_JSONLD}
      />
      <div className="flex-1 max-w-3xl mx-auto px-4 py-12 lg:py-20 w-full">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Blockwork
        </Link>
        <h1 className="text-2xl font-bold text-foreground mb-3">How Blockwork works</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          From listing to payout, here's the full flow — the same six steps whether you're a teen earning, a parent supervising, or a neighbor getting help. Blockwork is currently available in California only.
        </p>
        <div className="space-y-4">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="bg-card rounded-2xl border border-border shadow-soft p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-foreground text-sm">{s.title}</h2>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{s.body}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}