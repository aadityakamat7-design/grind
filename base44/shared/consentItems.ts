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
  { key: 'labor_laws', label: 'I understand my teen must follow the child-labor laws for their state, including hour limits, school-day restrictions, and category minimums shown above — and that Blockwork enforces these server-side.' },
  { key: 'revocation', label: 'I understand I can revoke my authorization at any time, which immediately pauses my teen\'s account and flags any in-progress bookings for review.' },
];