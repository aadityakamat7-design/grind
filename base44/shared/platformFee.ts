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

// Tip processing fee — 3.5% + $0.50 per tip, charged to cover Stripe's
// processing cost on tip charges. Only applied when a tip is actually
// charged (a $0 tip incurs no fee).
export const TIP_FEE_RATE = 0.035;
export const TIP_FEE_FIXED = 0.50;

export function calculateTipFee(tip: number): number {
  const t = Number(tip) || 0;
  if (t <= 0) return 0;
  return Math.round((t * TIP_FEE_RATE + TIP_FEE_FIXED) * 100) / 100;
}

export function calculateTipNet(tip: number): number {
  const t = Number(tip) || 0;
  if (t <= 0) return 0;
  const fee = calculateTipFee(t);
  return Math.round((t - fee) * 100) / 100;
}