// RETIRED — Stripe Identity verification has been removed. Parents are now
// verified through Stripe Connect Express onboarding. This function always
// returns false so any code that checks it skips the identity flow.
export async function isIdentityVerificationEnabled(base44): Promise<boolean> {
  return false;
}