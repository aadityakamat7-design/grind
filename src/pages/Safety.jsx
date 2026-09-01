import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ArrowLeft, IdCard, Landmark, Lock, Eye, MessageSquare, AlertTriangle, Users, Home } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";

const PILLARS = [
  {
    icon: Home,
    title: "No home entry — ever",
    body: "Teens never enter a client's home under any circumstances. All in-person work is performed outdoors on the exterior of the property, and all tutoring and tech help is conducted remotely over video. Requesting or permitting a teen to enter a residence is a material violation of our terms and grounds for immediate account termination.",
  },
  {
    icon: IdCard,
    title: "Identity verification for everyone",
    body: "Every parent verifies their identity with a government ID through Stripe Identity before they can approve their teen's first job. Teens also verify the first time they accept a job. We never see or store raw ID images — only the verification result.",
  },
  {
    icon: Landmark,
    title: "Secure payouts through Stripe Connect",
    body: "Parents connect a bank account directly with Stripe. We never see or store bank account or routing numbers — only the masked last four digits and the account status. All earnings pay out to the parent's account, never directly to the teen.",
  },
  {
    icon: Lock,
    title: "Escrow-protected payments",
    body: "When a neighbor books a job, their payment is held in escrow. The teen gets paid only after both sides confirm the job is complete. If something goes wrong, the parent can deny the booking and the neighbor gets a full refund.",
  },
  {
    icon: Users,
    title: "Parental oversight on every job",
    body: "No job is confirmed without the parent's explicit approval. Parents see the job details, the neighbor's name, the location, and the pay before saying yes. A parent can deny any booking at any time before it starts.",
  },
  {
    icon: Eye,
    title: "PII protection before booking",
    body: "A teen's exact address and a neighbor's home address are hidden until a booking is confirmed. Messages are monitored for attempts to share contact information before a booking is approved.",
  },
  {
    icon: MessageSquare,
    title: "In-app messaging only",
    body: "All communication happens inside Blockwork. Messages are masked for personal information until a booking is confirmed. This keeps conversations on the platform where they're protected.",
  },
  {
    icon: AlertTriangle,
    title: "Safety alerts and reporting",
    body: "Teens can alert their parent instantly from any active job. Anyone can report a safety concern, inappropriate behavior, or an off-platform attempt. Reports are reviewed by our team and acted on quickly.",
  },
];

export default function Safety() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 max-w-3xl mx-auto px-4 py-12 lg:py-20 w-full">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Blockwork
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-foreground flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-background" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Safety at Blockwork</h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          Safety isn't a feature — it's the foundation of everything we built. Blockwork connects neighborhood teens with outdoor tasks and online tutoring, but only inside a system designed to protect young people and give parents confidence. Teens never enter a client's home — all in-person work happens outdoors, and all tutoring happens over video. Here's how every layer works.
        </p>
        <div className="space-y-4">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="bg-card rounded-2xl border border-border shadow-soft p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-foreground text-sm">{p.title}</h2>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{p.body}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-8 bg-secondary border border-border rounded-2xl p-5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            For urgent safety concerns during an active job, use the "Alert parent" or "Report" buttons directly in the booking or chat. For emergencies, call 911 immediately.
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}