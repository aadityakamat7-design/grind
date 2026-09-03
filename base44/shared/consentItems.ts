// The itemized parental consent acknowledgments. Server-authoritative source —
// confirmParentLink validates every key is accepted and records these exact
// labels in the ConsentRecord audit trail. Mirrors src/lib/stateWorkRules.js
// CONSENT_ITEMS; keep in sync.
//
// Each item has a short `label` (displayed to the parent as a scannable
// one-liner) and a `fullLabel` (the full legal text recorded in the
// ConsentRecord audit trail). Shortening the display does not reduce what's
// recorded — the full legal text is always stored alongside the short version.

export const CONSENT_VERSION = '1.0';

export const CONSENT_ITEMS: { key: string; label: string; fullLabel: string }[] = [
  {
    key: 'relationship',
    label: "I am this teen's parent or legal guardian.",
    fullLabel: "I confirm I am this teen's parent or legal guardian, and I authorize them to use Blockwork under my supervision.",
  },
  {
    key: 'booking_approval',
    label: "I approve every job before my teen accepts it.",
    fullLabel: "I understand I must approve or deny every booking request before it is confirmed, and that confirmed bookings cannot be auto-started without my teen's and the buyer's mutual confirmation.",
  },
  {
    key: 'labor_laws',
    label: "California hour limits and age rules apply, and Blockwork enforces them.",
    fullLabel: "I understand my teen must follow California's child-labor laws, including the hour limits, prohibited work hours, and category minimums shown above — and that Blockwork enforces these hour limits server-side. The casual, irregular odd jobs offered on this platform (light outdoor tasks and online tutoring) are generally exempt from California's work-permit requirement under the state's odd-jobs exemption for irregular casual work in private homes, as described in the California DIR Child Labor Law Pamphlet (dir.ca.gov/dlse). I understand that I remain responsible for confirming any permit requirements applicable to my teen's situation, and that Blockwork does not determine permit eligibility. Hour limits, age restrictions, and hazardous-occupation rules still apply and are enforced by the platform. I am responsible for monitoring my teen's overall work hours, including any work outside Blockwork.",
  },
  {
    key: 'payment',
    label: "I authorize Blockwork to process payments and send payouts to my bank account.",
    fullLabel: "I authorize Blockwork to process payments on my behalf — holding buyer funds in escrow and transferring payouts to my connected bank account, never directly to my teen.",
  },
  {
    key: 'messaging_access',
    label: "I can read my teen's messages and revoke access at any time.",
    fullLabel: "I understand I can read all messages between my teen and buyers at any time, and that Blockwork masks personal contact info (phone, email, address) until a booking is confirmed. I understand I can revoke my authorization at any time, which immediately pauses my teen's account and flags any in-progress bookings for review.",
  },
  {
    key: 'location_safety',
    label: "For outdoor jobs, the address is shared only after I approve, and my teen can alert me anytime.",
    fullLabel: "I understand that for outdoor jobs, the buyer's address is revealed to my teen only after I approve the booking, and that my teen can trigger a safety alert at any time during a job.",
  },
];

// Conditionally required when Stripe Identity verification is enabled (the
// default). When the admin toggle is off, this item is excluded from the
// required set and the identity verification step is skipped entirely.
export const IDENTITY_CONSENT_ITEM = {
  key: 'identity',
  label: "I'll verify my identity with a government ID before payouts are released.",
  fullLabel: "I understand I must verify my identity with a government ID before payouts are released to my bank account.",
};

// The long legal explanation moved out of the checkboxes into a collapsible
// "Read full terms" section. This text is shown to the parent and recorded in
// the ConsentRecord audit trail (as a separate consent entry with key
// 'full_terms_read').
export const FULL_TERMS_TEXT = `Blockwork enforces California child-labor hour limits server-side — a booking that would push your teen over their daily or weekly limit, or that falls in a prohibited time window, is rejected automatically. The casual, irregular odd jobs offered on this platform (light outdoor tasks and online tutoring) are generally exempt from California's work-permit requirement under the state's odd-jobs exemption for irregular casual work in private homes, as described in the California DIR Child Labor Law Pamphlet (dir.ca.gov/dlse). Parents and teens remain responsible for confirming any requirements applicable to their situation — Blockwork does not determine permit eligibility. Hour limits, age restrictions, and hazardous-occupation rules still apply. You remain responsible for monitoring your teen's total work hours, including any work outside Blockwork. Source: California DIR Child Labor Law Pamphlet (dir.ca.gov/dlse). Blockwork operates in California only.`;