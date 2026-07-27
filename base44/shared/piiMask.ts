// Server-side PII masking for chat messages. This is the single source of
// truth — the client never sees unmasked PII for unconfirmed bookings and
// can never bypass the flagging logic.

const PHONE_RE = /(\+?\d[\d\-.\s()]{7,}\d)/g;
const EMAIL_RE = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
const ADDRESS_RE = /(\d{1,5}\s+[A-Za-z0-9.\s]{2,}\s(?:street|st|avenue|ave|road|rd|blvd|lane|ln|drive|dr|court|ct|way)\b)/gi;
const OFFPLATFORM_RE = /\b(venmo|cashapp|cash app|zelle|paypal|whatsapp|snapchat|instagram|text me|call me)\b/gi;

export function maskPII(body: string, isConfirmed: boolean): { text: string; flagged: boolean } {
  if (isConfirmed) return { text: body, flagged: false };
  let flagged = false;
  let text = body;
  // Reset lastIndex for stateful regexes
  PHONE_RE.lastIndex = 0;
  EMAIL_RE.lastIndex = 0;
  ADDRESS_RE.lastIndex = 0;
  OFFPLATFORM_RE.lastIndex = 0;
  if (PHONE_RE.test(text) || EMAIL_RE.test(text) || ADDRESS_RE.test(text) || OFFPLATFORM_RE.test(text)) {
    flagged = true;
  }
  // Reset again before replace
  PHONE_RE.lastIndex = 0;
  EMAIL_RE.lastIndex = 0;
  ADDRESS_RE.lastIndex = 0;
  text = text
    .replace(PHONE_RE, '•••-•••-••••')
    .replace(EMAIL_RE, '•••@•••')
    .replace(ADDRESS_RE, '[address hidden until confirmed]');
  return { text, flagged };
}