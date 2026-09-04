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