// Centralized platform fee calculation — 12.9% + $0.30 fixed per transaction.
// Used by every backend function that computes or validates a platform fee so
// the rate lives in exactly one place.

export const PLATFORM_FEE_RATE = 0.129;
export const PLATFORM_FEE_FIXED = 0.30;

export function calculatePlatformFee(gross: number): number {
  return Math.round((gross * PLATFORM_FEE_RATE + PLATFORM_FEE_FIXED) * 100) / 100;
}

export function calculateNetAmount(gross: number): number {
  const fee = calculatePlatformFee(gross);
  return Math.round((gross - fee) * 100) / 100;
}

// Tips are 100% fee-free — the full tip amount goes to the teen/parent.
// Blockwork absorbs the Stripe processing cost on tips. These functions are
// kept for API compatibility but always return 0 fee / full tip.
export const TIP_FEE_RATE = 0;
export const TIP_FEE_FIXED = 0;

export function calculateTipFee(tip: number): number {
  return 0;
}

export function calculateTipNet(tip: number): number {
  const t = Number(tip) || 0;
  if (t <= 0) return 0;
  return Math.round(t * 100) / 100;
}