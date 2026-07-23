// Shared constants, helpers, and safety logic for Grind

export const PLATFORM_FEE_RATE = 0.15;

// Price caps — enforced server-side via entity schema, mirrored here for
// client-side validation so users get immediate feedback before Stripe.
export const MAX_UNIT_PRICE = 500;   // per-job or per-hour rate (Listing, JobPost)
export const MAX_TOTAL_PRICE = 2000; // escrow total incl. multi-hour (Booking, JobPost.charge)

export const CATEGORIES = [
  { value: "tutoring", label: "Tutoring", icon: "GraduationCap" },
  { value: "lawn_care", label: "Lawn Care", icon: "Sprout" },
  { value: "pet_sitting", label: "Pet Sitting", icon: "Dog" },
  { value: "tech_help", label: "Tech Help", icon: "Laptop" },
  { value: "babysitting", label: "Babysitting", icon: "Baby" },
  { value: "car_washing", label: "Car Washing", icon: "Car" },
  { value: "odd_jobs", label: "Odd Jobs", icon: "Hammer" },
];

export const CATEGORY_LABELS = CATEGORIES.reduce((acc, c) => {
  acc[c.value] = c.label;
  return acc;
}, {});

export const SKILL_SUGGESTIONS = [
  "Math", "Reading", "Coding", "Spanish", "Piano", "Mowing",
  "Weeding", "Dog walking", "Cat care", "Phone setup", "Wi-Fi help",
  "Babysitting", "Car detailing", "Moving boxes", "Yard cleanup",
];

// --- Task hazard safety check ---
// Blocks tasks unsafe/illegal for minors and CA/NY hazardous-occupations items.
const HAZARD_RULES = [
  { keywords: ["roof", "roofing", "gutter"], reason: "Roof and gutter work is prohibited for minors." },
  { keywords: ["ladder", "scaffold"], reason: "Work requiring ladders or scaffolding is not allowed." },
  { keywords: ["chainsaw", "chain saw"], reason: "Power saws are on the hazardous-occupations list for minors." },
  { keywords: ["drive", "driving", "deliver by car", "chauffeur"], reason: "Driving as a service is not permitted for minors." },
  { keywords: ["power washer", "pressure washer"], reason: "Pressure washing may be restricted for under-16." },
  { keywords: ["chemical", "pesticide", "herbicide"], reason: "Handling hazardous chemicals is prohibited." },
  { keywords: ["electrical", "wiring", "circuit"], reason: "Electrical work is prohibited for minors." },
  { keywords: ["firearm", "gun", "weapon"], reason: "Prohibited task." },
];

export function checkHazard(text = "", age = 18) {
  const lower = text.toLowerCase();
  for (const rule of HAZARD_RULES) {
    if (rule.keywords.some((k) => lower.includes(k))) {
      return { flagged: true, reason: rule.reason };
    }
  }
  // Power equipment restricted for under 16
  if (age < 16 && /(mower|leaf blower|trimmer|power tool|weed whacker)/.test(lower)) {
    return { flagged: true, reason: "Power equipment (mowers, blowers, trimmers) is not allowed for under-16." };
  }
  return { flagged: false, reason: "" };
}

// --- PII masking for messages pre-confirmation ---
const PHONE_RE = /(\+?\d[\d\-.\s()]{7,}\d)/g;
const EMAIL_RE = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
const ADDRESS_RE = /(\d{1,5}\s+[A-Za-z0-9.\s]{2,}\s(?:street|st|avenue|ave|road|rd|blvd|lane|ln|drive|dr|court|ct|way)\b)/gi;
const OFFPLATFORM_RE = /\b(venmo|cashapp|cash app|zelle|paypal|whatsapp|snapchat|instagram|text me|call me)\b/gi;

export function maskPII(body, isConfirmed) {
  if (isConfirmed) return { text: body, flagged: false };
  let flagged = false;
  let text = body;
  if (PHONE_RE.test(text) || EMAIL_RE.test(text) || ADDRESS_RE.test(text) || OFFPLATFORM_RE.test(text)) {
    flagged = true;
  }
  text = text
    .replace(PHONE_RE, "•••-•••-••••")
    .replace(EMAIL_RE, "•••@•••")
    .replace(ADDRESS_RE, "[address hidden until confirmed]");
  return { text, flagged };
}

export function computeFees(total) {
  const platform_fee = Math.round(total * PLATFORM_FEE_RATE * 100) / 100;
  const net_amount = Math.round((total - platform_fee) * 100) / 100;
  return { platform_fee, net_amount };
}

export function calcAge(dobStr) {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

export function genInviteCode() {
  // 6-character code a parent enters to link to their teen
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export const money = (n) => `$${Number(n || 0).toFixed(2)}`;