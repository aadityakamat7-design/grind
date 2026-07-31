// Two-sided referral program: both neighbors earn credit when the
// invited friend completes their first booking.
import { base44 } from "@/api/base44Client";
import { genInviteCode } from "@/lib/grind";

export const REFERRAL_REWARD = 10;

// Ensure a profile (buyer or teen) has a referral code (handles profiles created before this feature)
export async function ensureReferralCode(profile, entityName = "BuyerProfile") {
  if (profile.referral_code) return profile;
  const code = genInviteCode();
  await base44.entities[entityName].update(profile.id, { referral_code: code });
  return { ...profile, referral_code: code };
}

// Redeem a friend's code during onboarding. Delegates to a server function
// (redeemReferralCode) that looks up the referrer using service role, since
// BuyerProfile RLS restricts reads to owner+admin and a new user can't read
// another user's profile to find the referrer. Returns true if recorded.
export async function redeemReferralCode(code, newUser) {
  const cleaned = (code || "").trim().toUpperCase();
  if (!cleaned) return false;
  try {
    const res = await base44.functions.invoke("redeemReferralCode", { code: cleaned });
    return res.data?.redeemed === true;
  } catch {
    return false;
  }
}