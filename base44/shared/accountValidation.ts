// Server-side validation for everything a person can change about their own
// account. One file so every entry point (Settings, invite flows, admin tools)
// enforces exactly the same rules — the client shows the same wording, but the
// server is the authority.

export const NAME_MIN = 2;
export const NAME_MAX = 60;
export const BIO_MAX = 300;
export const NOTES_MAX = 500;

// Letters (including accents), spaces, apostrophes, hyphens and periods only.
const NAME_ALLOWED = /^[A-Za-z\u00C0-\u024F' .-]+$/;
const LETTERS = /[A-Za-z\u00C0-\u024F]/g;

export type ValidationResult<T = string> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/** Trims, collapses spaces and rejects names with numbers or symbols. */
export function validateFullName(raw: unknown, email?: string): ValidationResult {
  const value = String(raw ?? '').trim().replace(/\s+/g, ' ');
  if (!value) return { ok: false, error: 'Enter your first and last name.' };
  if (value.length < NAME_MIN) return { ok: false, error: 'That name looks too short.' };
  if (value.length > NAME_MAX) return { ok: false, error: `Please keep your name under ${NAME_MAX} characters.` };
  if (/\d/.test(value)) return { ok: false, error: 'Names can\'t contain numbers.' };
  if (!NAME_ALLOWED.test(value)) {
    return { ok: false, error: 'Names can only use letters, spaces, hyphens, apostrophes and periods.' };
  }
  if ((value.match(LETTERS) || []).length < 2) {
    return { ok: false, error: 'Enter your real first and last name.' };
  }
  // A name that is just the email username is not a real name.
  const local = String(email || '').split('@')[0] || '';
  const flat = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
  if (local.length >= 3 && flat(value) === flat(local)) {
    return { ok: false, error: 'Please enter your real name, not your email username.' };
  }
  // Two words for everyone except single-word legal names are still allowed —
  // we only require at least two letters, not two words.
  return { ok: true, value };
}

/** First name plus last initial — the only form ever shown publicly. */
export function deriveDisplayName(fullName: string): string {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

/** Optional US phone number; returns '' when left blank. */
export function validatePhone(raw: unknown): ValidationResult {
  const value = String(raw ?? '').trim();
  if (!value) return { ok: true, value: '' };
  const digits = value.replace(/\D/g, '');
  const local = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (local.length !== 10) {
    return { ok: false, error: 'Enter a 10-digit US phone number, like (555) 123-4567.' };
  }
  if (/^[01]/.test(local) || /^1/.test(local.slice(3))) {
    return { ok: false, error: "That doesn't look like a real US phone number." };
  }
  return { ok: true, value: `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}` };
}

export function validateZip(raw: unknown): ValidationResult {
  const value = String(raw ?? '').trim();
  if (!/^\d{5}$/.test(value)) return { ok: false, error: 'Enter a 5-digit ZIP code.' };
  return { ok: true, value };
}

// Public descriptions (a teen's "About me") must never carry contact details or
// a location a stranger could use. Each pattern has its own plain-English
// reason so the person knows exactly what to take out.
const BIO_BLOCKERS: { test: RegExp; error: string }[] = [
  {
    test: /(\+?1[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/,
    error: 'Remove the phone number — messages stay inside Blockwork.',
  },
  {
    test: /[\w.+-]+@[\w-]+\.[\w.]{2,}/,
    error: 'Remove the email address — messages stay inside Blockwork.',
  },
  {
    test: /\b(https?:\/\/|www\.)\S+/i,
    error: 'Remove the link.',
  },
  {
    test: /\b\S+\.(com|org|net|io|co|me|app|gg|tv|us|edu)\b/i,
    error: 'Remove the website address.',
  },
  {
    test: /\b(instagram|insta|snapchat|snap ?chat|snap|tiktok|twitter|x\.com|discord|telegram|whatsapp|kik|venmo|paypal|cash ?app|onlyfans)\b/i,
    error: 'Remove the social handle — contact happens here on Blockwork.',
  },
  {
    test: /(^|[\s(])@[A-Za-z0-9._]{2,}/,
    error: 'Remove the @handle.',
  },
  {
    test: /\b\d{1,6}\s+[A-Za-z][A-Za-z.]*\s+(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|way|ct|court|pl|place|ter|terrace|cir|circle|hwy|highway)\b/i,
    error: 'Remove the street address.',
  },
  {
    test: /\b(high school|middle school|elementary school|junior high|highschool|prep school|school)\b/i,
    error: "Don't name your school.",
  },
  {
    test: /\b[A-Z]{5}\d{3,}\b/,
    error: 'Remove the student ID.',
  },
];

/** Teens and independents: public "About me" text. */
export function validateBio(raw: unknown, max = BIO_MAX): ValidationResult {
  const value = String(raw ?? '').trim();
  if (!value) return { ok: true, value: '' };
  if (value.length > max) {
    return { ok: false, error: `Keep your About me under ${max} characters.` };
  }
  for (const blocker of BIO_BLOCKERS) {
    if (blocker.test.test(value)) return { ok: false, error: blocker.error };
  }
  return { ok: true, value };
}

/** Job notes on a saved address: practical details only, same contact rules. */
export function validateJobNotes(raw: unknown): ValidationResult {
  const value = String(raw ?? '').trim();
  if (!value) return { ok: true, value: '' };
  if (value.length > NOTES_MAX) {
    return { ok: false, error: `Keep job notes under ${NOTES_MAX} characters.` };
  }
  return { ok: true, value };
}

export function validateLabel(raw: unknown): ValidationResult {
  const value = String(raw ?? '').trim();
  if (!value) return { ok: true, value: 'Home' };
  if (value.length > 30) return { ok: false, error: 'Keep the label under 30 characters.' };
  if (/[\w.+-]+@[\w-]+\.[\w.]{2,}/.test(value) || /(\+?1[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/.test(value)) {
    return { ok: false, error: 'A label is just a name like "Home".' };
  }
  return { ok: true, value };
}

export function isValidEmail(raw: unknown): boolean {
  const value = String(raw ?? '').trim();
  return value.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}