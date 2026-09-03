// The itemized parental consent acknowledgments. Server-authoritative source —
// confirmParentLink validates every key is accepted and records these exact
// labels in the ConsentRecord audit trail. Mirrors src/lib/stateWorkRules.js
// CONSENT_ITEMS; keep in sync.

export const CONSENT_VERSION = '1.0';

export const CONSENT_ITEMS: { key: string; label: string }[] = [
  { key: 'identity', label: 'I understand I must verify my identity with a government ID before payouts are released to my bank account.' },
  { key: 'relationship', label: "I confirm I am this teen's parent or legal guardian, and I authorize them to use Blockwork under my supervision." },
  { key: 'payment', label: 'I authorize Blockwork to process payments on my behalf — holding buyer funds in escrow and transferring payouts to my connected bank account, never directly to my teen.' },
  { key: 'booking_approval', label: "I understand I must approve or deny every booking request before it is confirmed, and that confirmed bookings cannot be auto-started without my teen's and the buyer's mutual confirmation." },
  { key: 'messaging_access', label: 'I understand I can read all messages between my teen and buyers at any time, and that Blockwork masks personal contact info (phone, email, address) until a booking is confirmed.' },
  { key: 'location_safety', label: "I understand that for outdoor jobs, the buyer's address is revealed to my teen only after I approve the booking, and that my teen can trigger a safety alert at any time during a job." },
  { key: 'labor_laws', label: "I understand my teen must follow California's child-labor laws, including the hour limits, prohibited work hours, and category minimums shown above — and that Blockwork enforces these hour limits server-side. The casual, irregular odd jobs offered on this platform (light outdoor tasks and online tutoring) are generally exempt from California's work-permit requirement under the state's odd-jobs exemption for irregular casual work in private homes, as described in the California DIR Child Labor Law Pamphlet (dir.ca.gov/dlse). I understand that I remain responsible for confirming any permit requirements applicable to my teen's situation, and that Blockwork does not determine permit eligibility. Hour limits, age restrictions, and hazardous-occupation rules still apply and are enforced by the platform. I am responsible for monitoring my teen's overall work hours, including any work outside Blockwork." },
  { key: 'revocation', label: 'I understand I can revoke my authorization at any time, which immediately pauses my teen\'s account and flags any in-progress bookings for review.' },
];