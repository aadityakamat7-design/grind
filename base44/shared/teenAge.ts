// Computes the teen's age from their parent-confirmed DOB (source of truth)
// when available, falling back to the self-reported DOB only before the
// parent has confirmed it. Used by server functions that gate hazard
// eligibility and job acceptance so a teen can never inflate their age
// to unlock jobs above their real legal eligibility.
//
// The parent-confirmed DOB is stored in TeenPrivateData.verified_dob and is
// set during link confirmation (confirmParentLink). The parent attests the
// teen's date of birth and it becomes the source of truth for every age rule.
// For independent 18+ teens with no parent, the self-reported date_of_birth
// is used (their own Stripe Connect onboarding is their adult check).
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