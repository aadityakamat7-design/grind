import React, { useState } from "react";
import { Link } from "react-router-dom";
import { HelpCircle, X, ChevronDown, LifeBuoy, ExternalLink } from "lucide-react";

const QUICK_FAQS = [
  {
    q: "How do teens get paid?",
    a: "Payment is charged through Stripe and held in escrow. The teen does the work, uploads photo proof, the neighbor confirms, and only then is the money released to the teen's parent.",
  },
  {
    q: "Is it safe?",
    a: "Every parent verifies with a government ID, a parent approves every booking, all in-person work is outdoors, and a teen can alert their parent instantly from any active job.",
  },
  {
    q: "How does parent approval work?",
    a: "No job is confirmed without a parent's explicit approval. The parent sees the job details, neighbor name, location, and pay before saying yes.",
  },
  {
    q: "What kinds of jobs are allowed?",
    a: "Outdoor tasks (lawn, yard, car washing, dog walking) and online tutoring/tech help. No home entry, heavy machinery, or hazardous equipment.",
  },
  {
    q: "How old do teens need to be?",
    a: "Teens must be at least 13. Teens 13–17 need a linked, verified parent. Teens 18+ may use the platform independently.",
  },
];

export default function HelpWidget() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);

  return (
    <>
      {/* Floating button — sits above the mobile bottom nav */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Help & FAQ"
        className="fixed bottom-[80px] lg:bottom-4 right-3 z-40 w-9 h-9 rounded-full bg-primary text-primary-foreground shadow-floating flex items-center justify-center active:scale-95 transition-transform"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {/* Sheet */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 lg:bottom-6 lg:right-4 lg:inset-x-auto lg:w-[400px] bg-card border border-border rounded-t-2xl lg:rounded-2xl shadow-floating pb-[env(safe-area-inset-bottom)] max-h-[80vh] overflow-y-auto animate-[sheet-up_0.25s_ease-out]">
            <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground text-[15px]">Help & FAQ</h2>
                  <p className="text-xs text-muted-foreground">Quick answers — no need to leave the page</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-2">
              {QUICK_FAQS.map((f, i) => (
                <div key={i} className="bg-secondary rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpanded(expanded === i ? null : i)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left min-h-[48px]"
                  >
                    <span className="text-[14px] font-semibold text-foreground">{f.q}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${expanded === i ? "rotate-180" : ""}`} />
                  </button>
                  {expanded === i && (
                    <p className="px-4 pb-3.5 text-[13px] text-muted-foreground leading-relaxed">{f.a}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="px-5 pb-5 pt-2 border-t border-border space-y-2">
              <Link
                to="/faq"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-secondary hover:bg-accent transition-colors min-h-[48px]"
              >
                <span className="text-[14px] font-semibold text-foreground">See all FAQs</span>
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </Link>
              <Link
                to="/support"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-secondary hover:bg-accent transition-colors min-h-[48px]"
              >
                <span className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
                  <LifeBuoy className="w-4 h-4" /> Contact support
                </span>
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}