// Delivery mode mapping for Kickstart's two permitted job types.
//
// outdoor — work performed outside the residence (lawn care, car washing,
//   dog walking with doorstep pickup, yard work, etc.). Never inside a home.
// online — work performed remotely via video (tutoring, remote tech help).
//   No physical meeting at all.
//
// All in-home categories (babysitting, childcare, in-home pet sitting, house
// cleaning, elder care, in-person tech help, in-person tutoring) are removed
// from the platform. Teens never enter a client's home under any circumstance.

export const DELIVERY_MODES = ['outdoor', 'online'] as const;
export type DeliveryMode = typeof DELIVERY_MODES[number];

// The canonical category → delivery_mode mapping. Every allowed category
// maps to exactly one delivery mode. Categories not listed here are rejected
// by the server functions.
export const CATEGORY_DELIVERY_MODE: Record<string, DeliveryMode> = {
  tutoring: 'online',
  tech_help: 'online',
  lawn_care: 'outdoor',
  car_washing: 'outdoor',
  odd_jobs: 'outdoor',
  pet_sitting: 'outdoor', // dog walking / doorstep pickup only — no home entry
};

// All categories still permitted on the platform (babysitting removed).
export const ALLOWED_CATEGORIES = Object.keys(CATEGORY_DELIVERY_MODE);

export function getDeliveryMode(category: string | undefined | null): DeliveryMode | null {
  if (!category) return null;
  return CATEGORY_DELIVERY_MODE[category] || null;
}

export function isOnlineCategory(category: string | undefined | null): boolean {
  return getDeliveryMode(category) === 'online';
}

export function isOutdoorCategory(category: string | undefined | null): boolean {
  return getDeliveryMode(category) === 'outdoor';
}

// Returns true if the category is one of the removed in-home categories.
// Used by server functions to reject legacy categories with a clear message.
export const REMOVED_CATEGORIES = new Set([
  'babysitting',
  'childcare',
  'house_cleaning',
  'elder_care',
]);

export function isRemovedCategory(category: string | undefined | null): boolean {
  return !!category && REMOVED_CATEGORIES.has(category);
}

// Generate a video session link for online bookings. Uses Jitsi Meet
// (free, no API key required) with a unique room ID tied to the booking.
export function generateSessionLink(bookingId: string): string {
  const safeId = bookingId.replace(/[^a-zA-Z0-9]/g, '');
  const suffix = Math.random().toString(36).slice(2, 8);
  return `https://meet.jit.si/kickstart_${safeId}_${suffix}`;
}