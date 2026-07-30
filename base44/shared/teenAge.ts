// Computes the teen's age from their Stripe-verified DOB (source of truth)
// when available, falling back to the self-reported DOB only before
// verification completes. Used by server functions that gate hazard
// eligibility and job acceptance so a teen can never inflate their age
// to unlock jobs above their real legal eligibility.
export function getVerifiedAge(
  privateData: { verified_dob?: string; date_of_birth?: string; age?: number } | null
): number | null {
  if (!privateData) return null;
  const dob = privateData.verified_dob || privateData.date_of_birth;
  if (!dob) return privateData.age ?? null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return privateData.age ?? null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}