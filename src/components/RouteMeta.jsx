import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Single source of truth for document.title and meta description.
// Rendered once in App.jsx inside <Router>, so it fires on every
// navigation — including back/forward — regardless of whether the
// page renders its own <Seo>. This prevents stale titles from
// persisting when a page has no Seo component.
const DEFAULT_TITLE = "Blockwork — Teens earn. Neighbors get things done.";
const DEFAULT_DESCRIPTION =
  "Parent-approved local marketplace where California teens earn real paychecks doing outdoor work and online tutoring. Currently available in California only.";

const ROUTE_META = {
  "/": { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION },
  "/login": { title: "Log in — Blockwork", description: "Log in to your Blockwork account." },
  "/register": { title: "Sign up — Blockwork", description: "Create a Blockwork account as a teen, parent, or neighbor." },
  "/forgot-password": { title: "Reset password — Blockwork", description: "Reset your Blockwork password." },
  "/reset-password": { title: "Reset password — Blockwork", description: "Set a new password for your Blockwork account." },
  "/terms": { title: "Terms of Service — Blockwork", description: "The rules for using Blockwork: eligibility, parental consent, no-home-entry policy, escrow payments, minor work-hour limits, and dispute resolution." },
  "/privacy": { title: "Privacy Policy — Blockwork", description: "What Blockwork collects, why, and your rights — including minors' data, parental consent, and payment data processed by Stripe." },
  "/safety": { title: "Safety — Blockwork", description: "How Blockwork keeps teens safe: parent approval, ID verification, escrow payments, enforced minor work-hour limits, and a strict no-home-entry policy." },
  "/about": { title: "About — Blockwork", description: "A secure, parent-monitored marketplace where neighborhood teens find local work and adults get reliable help with outdoor tasks and online tutoring." },
  "/support": { title: "Support — Blockwork", description: "Get help with Blockwork — contact our team for any question or issue." },
  "/faq": { title: "FAQ — Blockwork", description: "Answers to common Blockwork questions: how teens get paid, safety, what teens can earn, work permits, and how parent approval works." },
  "/how-it-works": { title: "How it works — Blockwork", description: "How Blockwork connects California teens with neighbors for outdoor tasks and online tutoring, with parent approval and escrow-protected payments." },
  "/oauth/consent": { title: "Authorize — Blockwork", description: "Authorize a third-party application to access your Blockwork account." },
  "/onboarding": { title: "Get started — Blockwork", description: "Set up your Blockwork account as a teen, parent, or neighbor." },
  "/account": { title: "Account — Blockwork", description: "Manage your Blockwork account settings." },
  "/teen": { title: "Dashboard — Blockwork", description: "Your teen dashboard on Blockwork." },
  "/teen/listings": { title: "My listings — Blockwork", description: "Manage your service listings on Blockwork." },
  "/teen/bookings": { title: "My bookings — Blockwork", description: "View and manage your teen bookings on Blockwork." },
  "/teen/earnings": { title: "Earnings — Blockwork", description: "Track your teen earnings on Blockwork." },
  "/teen/wallet": { title: "Earnings — Blockwork", description: "Your Blockwork Wallet balance and transaction history." },
  "/parent": { title: "Parent Dashboard — Blockwork", description: "Monitor your teen's work, earnings, and safety on Blockwork." },
  "/parent/approvals": { title: "Approvals — Blockwork", description: "Review and approve booking requests for your teen." },
  "/parent/payouts": { title: "Payouts — Blockwork", description: "Manage payouts and withdrawals for your teen's earnings." },
  "/buyer": { title: "Dashboard — Blockwork", description: "Your neighbor dashboard on Blockwork." },
  "/buyer/bookings": { title: "My bookings — Blockwork", description: "View and manage your bookings on Blockwork." },
  "/browse": { title: "Browse — Blockwork", description: "Browse local teens offering outdoor tasks and online tutoring on Blockwork." },
  "/jobs": { title: "Jobs — Blockwork", description: "Browse local job posts from neighbors on Blockwork." },
  "/messages": { title: "Messages — Blockwork", description: "Your Blockwork conversations." },
  "/notifications": { title: "Notifications — Blockwork", description: "Your Blockwork notifications." },
  "/admin": { title: "Admin — Blockwork", description: "Blockwork admin console." },
  "/withdrawal-assistant": { title: "Withdrawal Assistant — Blockwork", description: "Get help with withdrawing your Blockwork Wallet earnings." },
};

// Dynamic routes matched by pattern (checked after static lookup).
const DYNAMIC_PATTERNS = [
  { re: /^\/bookings\/[^/]+\/video$/, meta: { title: "Video session — Blockwork", description: "Join a video tutoring session on Blockwork." } },
  { re: /^\/bookings\/[^/]+$/, meta: { title: "Booking — Blockwork", description: "Booking details on Blockwork." } },
  { re: /^\/teens\/[^/]+$/, meta: { title: "Teen profile — Blockwork", description: "View a teen's profile on Blockwork." } },
  { re: /^\/neighbors\/[^/]+$/, meta: { title: "Neighbor profile — Blockwork", description: "View a neighbor's profile on Blockwork." } },
  { re: /^\/messages\/[^/]+$/, meta: { title: "Messages — Blockwork", description: "Your Blockwork conversation." } },
];

function upsertMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function resolveMeta(pathname) {
  if (ROUTE_META[pathname]) return ROUTE_META[pathname];
  for (const p of DYNAMIC_PATTERNS) {
    if (p.re.test(pathname)) return p.meta;
  }
  return { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION };
}

export default function RouteMeta() {
  const location = useLocation();

  useEffect(() => {
    const { title, description } = resolveMeta(location.pathname);
    document.title = title;
    upsertMeta("name", "description", description);
  }, [location.pathname]);

  return null;
}