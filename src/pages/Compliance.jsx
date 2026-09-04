import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CreditCard, Wallet, ShieldCheck, ReceiptText, Scale, ShieldAlert, Info } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import Seo from "@/components/Seo";
import StripeBadge from "@/components/StripeBadge";

const SECTIONS = [
  {
    icon: CreditCard,
    title: "1. How payments work",
    summary: "The neighbor pays when the job starts, Stripe holds the money safely, and it's released only when both sides confirm the work is done.",
    body: (
      <>
        <p>Here's the flow, step by step:</p>
        <ul>
          <li><strong>Pay at start.</strong> When both the teen and the neighbor confirm the job is starting, the neighbor's card is charged through Stripe.</li>
          <li><strong>Held in escrow by Stripe.</strong> The money sits securely in a Stripe-managed escrow — not in a Blockwork bank account. Blockwork never holds anyone's money directly. Stripe does.</li>
          <li><strong>Released on confirmation.</strong> The teen uploads photo proof the work is finished. Once both the teen and the neighbor confirm the job is complete, the funds are released.</li>
          <li><strong>Full refund if cancelled early.</strong> If a job is cancelled before it starts, the neighbor is automatically and fully refunded.</li>
        </ul>
      </>
    ),
  },
  {
    icon: ReceiptText,
    title: "2. Fees",
    summary: "Blockwork takes 15% of each completed job. The teen receives 85%. There are no hidden fees, no signup fees, and no listing fees.",
    body: (
      <>
        <p>
          <strong>The split is simple:</strong> Blockwork takes 15% of each completed job, and the teen receives 85%. That's it.
        </p>
        <p>
          <strong>Worked example:</strong> On a $40 job, the teen earns $34. Blockwork keeps $6.
        </p>
        <p>
          <strong>Processing fees are on us.</strong> Stripe's card-processing fees are paid by Blockwork out of its 15% — they are <em>not</em> deducted from the teen's 85%. The teen's share is the teen's share.
        </p>
        <p>
          <strong>No surprises.</strong> There are no signup fees, no listing fees, and no monthly fees. The 15% only applies when a job is actually completed and paid for.
        </p>
      </>
    ),
  },
  {
    icon: Wallet,
    title: "3. How teens get paid",
    summary: "Payouts go to the parent's connected bank account — never directly to a minor — because payment processors require account holders to be 18+.",
    body: (
      <>
        <p>
          <strong>Why the parent gets the payout.</strong> Payment processors like Stripe require account holders to be 18 or older. So for teens under 18, earnings are paid out to the parent's connected bank account. The parent is responsible for passing the earnings along to their teen as they see fit.
        </p>
        <p>
          <strong>Independent teens 18+.</strong> Teens who are 18 or older can connect their own bank account and receive payouts directly.
        </p>
        <p>
          <strong>How long it takes.</strong> Once a payout is released, it typically arrives in the connected bank account within 1–2 business days via Stripe.
        </p>
        <p>
          <strong>New-account security hold.</strong> The first payout from a brand-new account is held for 72 hours as a fraud-prevention measure. After the hold lifts, the payout is released automatically — no action needed. This applies once per new account, not on every payout.
        </p>
      </>
    ),
  },
  {
    icon: ShieldCheck,
    title: "4. Payment security",
    summary: "Card and bank details are handled entirely by Stripe — a PCI-compliant processor. Blockwork never sees or stores full card or bank numbers.",
    body: (
      <>
        <p>
          <strong>Stripe handles the sensitive stuff.</strong> Every card number, CVC, and bank account detail goes straight to Stripe's PCI-compliant infrastructure — never through Blockwork's servers.
        </p>
        <p>
          <strong>What we store.</strong> Blockwork only keeps masked references (like the last four digits of a bank account) and a status indicator. We never see or store full card numbers or full bank account details.
        </p>
        <div className="bg-muted rounded-xl p-4 border border-border flex flex-col items-center gap-2">
          <StripeBadge showText={false} />
          <p className="text-[12px] text-muted-foreground text-center leading-tight max-w-sm">
            Payments securely processed by Stripe. We never see or store your card details.
          </p>
        </div>
      </>
    ),
  },
  {
    icon: ReceiptText,
    title: "5. Taxes",
    summary: "Earnings are generally self-employment income. Blockwork provides a year-end earnings summary, and most families won't receive a 1099-K.",
    body: (
      <>
        <p>
          <strong>It's usually self-employment income.</strong> Money a teen earns on Blockwork is generally considered self-employment income for tax purposes.
        </p>
        <p>
          <strong>1099-K reporting threshold.</strong> Blockwork issues a Form 1099-K only when a payee exceeds <strong>$20,000 and 200 transactions</strong> in a calendar year. Most families will not hit that threshold and won't receive one.
        </p>
        <p>
          <strong>Filing requirement.</strong> A teen generally must file a federal tax return once their net self-employment earnings reach <strong>$400</strong> in a year. This is a general IRS rule, not a Blockwork rule.
        </p>
        <p>
          <strong>Year-end summary.</strong> Blockwork provides a year-end earnings summary in the wallet so families have what they need for record-keeping.
        </p>
        <p className="bg-muted rounded-xl p-4 border border-border text-foreground">
          <strong>Blockwork does not provide tax advice.</strong> This section is general information, not guidance for your specific situation. For tax questions, consult a qualified tax professional.
        </p>
      </>
    ),
  },
  {
    icon: Scale,
    title: "6. California child-labor compliance",
    summary: "Blockwork is built to stay within California child-labor law — minimum ages, verified ages, enforced hour limits, hazard screening, and parental approval on every booking.",
    body: (
      <>
        <p>
          <strong>California only.</strong> Blockwork operates in California only, and every rule below reflects California law.
        </p>
        <ul>
          <li><strong>Minimum age 14 for platform jobs.</strong> Users under 13 are blocked entirely. To accept jobs on the platform, a teen must be at least 14.</li>
          <li><strong>Age is provided at signup and attested by the parent.</strong> A teen enters their date of birth when they register, and the linked parent or guardian confirms that date of birth is accurate as part of the parental consent flow.</li>
          <li><strong>Hour limits enforced automatically.</strong> The platform enforces California's daily and weekly hour caps server-side, with different limits for school days vs. non-school days and prohibited time windows (for example, no work before 7am or after 7pm on school nights for younger teens). A booking that would push a teen over a limit is rejected before it's confirmed.</li>
          <li><strong>Age-based job categories.</strong> Each job category has a minimum age. Hazardous tasks are screened and blocked before a listing goes live.</li>
          <li><strong>Verified parental approval on every booking.</strong> No job for a minor is confirmed unless the teen's parent reviews the details and explicitly approves it.</li>
        </ul>
        <p>
          <strong>The source.</strong> These rules are drawn from the California DIR Child Labor Law Pamphlet, available at <a href="https://www.dir.ca.gov/dlse" target="_blank" rel="noopener noreferrer" className="text-foreground font-medium hover:underline">dir.ca.gov/dlse</a>.
        </p>
        <p>
          <strong>Work permits — the honest framing.</strong> The casual, irregular odd jobs offered on Blockwork (light outdoor tasks and online tutoring) are generally exempt from California's work-permit requirement under the state's odd-jobs exemption for irregular casual work in private homes. However, parents and teens remain responsible for confirming any permit or employment requirements that apply to their specific situation — Blockwork does not determine permit eligibility. This exemption does <strong>not</strong> remove the hour limits, minimum-age rules, or hazard restrictions above; those still apply and are enforced by the platform.
        </p>
      </>
    ),
  },
  {
    icon: ShieldCheck,
    title: "7. Safety measures that support compliance",
    summary: "A short list of the built-in guardrails: no home entry, parent approval on every booking, masked contact info, in-app safety alerts, two-way reviews, and reporting/blocking.",
    body: (
      <>
        <ul>
          <li><strong>No home entry — ever.</strong> All in-person work happens outdoors; all tutoring happens over video.</li>
          <li><strong>Parent approval on every booking.</strong> No job for a minor is confirmed without the parent saying yes.</li>
          <li><strong>Contact info masked until confirmed.</strong> Addresses and contact details stay hidden until a booking is confirmed.</li>
          <li><strong>In-app safety alert.</strong> A teen can alert their parent instantly from any active job.</li>
          <li><strong>Two-way reviews.</strong> Neighbors and teens rate each other after every job.</li>
          <li><strong>Reporting and blocking.</strong> Anyone can report a concern or block another user at any time.</li>
        </ul>
      </>
    ),
  },
  {
    icon: Info,
    title: "8. What Blockwork is not",
    summary: "Blockwork is a technology platform that connects people. It does not employ teens and is not a staffing agency or employer.",
    body: (
      <>
        <p>
          Blockwork is a technology platform that connects neighbors with teens and their guardians. It does <strong>not</strong> employ teens, does not direct how work is performed, and is not a staffing agency or employer. The work agreement is between the neighbor and the teen's parent or guardian — Blockwork provides the marketplace and the safety rails, not the employment relationship.
        </p>
      </>
    ),
  },
];

export default function Compliance() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        title="Payments & Compliance"
        description="How money works on Blockwork and what keeps the platform legal — escrow, fees, payouts, payment security, taxes, and California child-labor compliance, explained in plain English."
        path="/compliance"
      />
      <div className="max-w-3xl mx-auto px-6 py-16 w-full">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <h1 className="font-heading text-3xl font-bold text-foreground mb-2">Payments & Compliance</h1>
        <p className="text-sm text-muted-foreground mb-8">A plain-English explanation of how money works on Blockwork and what keeps the platform legal.</p>

        <div className="space-y-6">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <section key={s.title} className="bg-card rounded-2xl border border-border shadow-soft p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-heading font-semibold text-foreground text-lg leading-tight">{s.title}</h2>
                  </div>
                </div>
                <p className="text-sm text-foreground font-medium bg-muted rounded-xl p-3 border border-border mb-3">
                  {s.summary}
                </p>
                <div className="prose prose-sm max-w-none text-muted-foreground [&_h2]:text-foreground [&_p]:leading-relaxed [&_li]:leading-relaxed [&_strong]:text-foreground [&_a]:text-primary">
                  {s.body}
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-8 flex items-start gap-3 bg-secondary border border-border rounded-2xl p-4">
          <ShieldAlert className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            This page explains how Blockwork works in plain language. It is not legal or tax advice, and it does not change the Terms of Service or Privacy Policy. For the full rules, see the Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}