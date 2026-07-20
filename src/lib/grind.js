// Shared Grind helpers: categories, PII masking, hazard check, formatting

export const CATEGORIES = [
  { value: "tutoring", label: "Tutoring", emoji: "📚" },
  { value: "lawn_care", label: "Lawn Care", emoji: "🌱" },
  { value: "pet_sitting", label: "Pet Sitting", emoji: "🐕" },
  { value: "tech_help", label: "Tech Help", emoji: "💻" },
  { value: "babysitting", label: "Babysitting", emoji: "🍼" },
  { value: "car_washing", label: "Car Washing", emoji: "🚗" },
  { value: "odd_jobs", label: "Odd Jobs", emoji: "🧰" },
];

export function categoryLabel(value) {
  const cat = CATEGORIES.find((c) => c.value === value);
  return cat ? `${cat.emoji} ${cat.label}` : value;
}

// Hazardous task keywords — block/flag at listing creation
const HAZARD_KEYWORDS = [
  "chainsaw", "power saw", "table saw", "ladder", "roof", "roofing",
  "driving", "drive ", "chauffeur", "power washer", "wood chipper",
  "forklift", "welding", "demolition", "electrical wiring", "gas line",
];

export function checkHazards(text) {
  const lower = (text || "").toLowerCase();
  return HAZARD_KEYWORDS.filter((k) => lower.includes(k));
}

// Mask phone numbers, emails, street addresses until booking is confirmed
export function maskPII(text) {
  if (!text) return { masked: text, wasMasked: false };
  let wasMasked = false;
  let masked = text
    .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, () => { wasMasked = true; return "•••-•••-••••"; })
    .replace(/\(\d{3}\)\s?\d{3}[-.\s]?\d{4}/g, () => { wasMasked = true; return "•••-•••-••••"; })
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, () => { wasMasked = true; return "•••@•••.•••"; })
    .replace(/\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|boulevard|blvd|way|place|pl)\b/gi, () => { wasMasked = true; return "[address hidden]"; });
  return { masked, wasMasked };
}

export const PLATFORM_FEE_RATE = 0.1;

export const money = (n) => `$${Number(n || 0).toFixed(2)}`;

export const BOOKING_STATUS = {
  pending_parent_approval: { label: "Awaiting parent approval", color: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Confirmed", color: "bg-emerald-100 text-emerald-800" },
  in_progress: { label: "In progress", color: "bg-blue-100 text-blue-800" },
  completed: { label: "Completed", color: "bg-slate-100 text-slate-700" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700" },
  disputed: { label: "Disputed", color: "bg-red-100 text-red-700" },
};

export function makeInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function calcAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export async function notify(base44, userId, title, body, link) {
  if (!userId) return;
  await base44.entities.Notification.create({ user_id: userId, title, body, link, type: "app" });
}