// Two-sided referral program: both neighbors earn credit when the
// invited friend completes their first booking.
import { base44 } from "@/api/base44Client";
import { genInviteCode, money } from "@/lib/grind";
import { notify } from "@/lib/notify";

export const REFERRAL_REWARD = 10;

// Ensure a profile (buyer or teen) has a referral code (handles profiles created before this feature)
export async function ensureReferralCode(profile, entityName = "BuyerProfile") {
  if (profile.referral_code) return profile;
  const code = genInviteCode();
  await base44.entities[entityName].update(profile.id, { referral_code: code });
  return { ...profile, referral_code: code };
}

// Redeem a friend's code during onboarding. Checks both buyer and teen referral
// codes, since either can invite a new neighbor. Returns true if a referral was recorded.
export async function redeemReferralCode(code, newUser) {
  const cleaned = (code || "").trim().toUpperCase();
  if (!cleaned) return false;
  const [buyerMatches, teenMatches] = await Promise.all([
    base44.entities.BuyerProfile.filter({ referral_code: cleaned }),
    base44.entities.TeenProfile.filter({ referral_code: cleaned }),
  ]);
  const referrer = buyerMatches[0] || teenMatches[0];
  if (!referrer || referrer.user_id === newUser.id) return false;
  const existing = await base44.entities.Referral.filter({ referred_user_id: newUser.id });
  if (existing.length > 0) return false;
  await base44.entities.Referral.create({
    referrer_user_id: referrer.user_id,
    referrer_name: (referrer.full_name || referrer.display_name)?.split(" ")[0] || "A neighbor",
    code: cleaned,
    referred_user_id: newUser.id,
    referred_name: newUser.full_name?.split(" ")[0] || "Your friend",
    reward_amount: REFERRAL_REWARD,
    status: "pending",
  });
  return true;
}

// Called when a buyer's booking payment is released. If this buyer was
// referred and hasn't triggered the reward yet, credit both sides.
export async function completeReferralIfEligible(buyerUserId, bookingId) {
  const refs = await base44.entities.Referral.filter({ referred_user_id: buyerUserId, status: "pending" });
  const ref = refs[0];
  if (!ref) return;
  await base44.entities.Referral.update(ref.id, {
    status: "completed",
    booking_id: bookingId,
    completed_at: new Date().toISOString(),
  });
  const [referrerProfiles, referredProfiles] = await Promise.all([
    base44.entities.BuyerProfile.filter({ user_id: ref.referrer_user_id }),
    base44.entities.BuyerProfile.filter({ user_id: ref.referred_user_id }),
  ]);
  const reward = ref.reward_amount || REFERRAL_REWARD;
  if (referrerProfiles[0])
    await base44.entities.BuyerProfile.update(referrerProfiles[0].id, {
      referral_credit: (referrerProfiles[0].referral_credit || 0) + reward,
    });
  if (referredProfiles[0])
    await base44.entities.BuyerProfile.update(referredProfiles[0].id, {
      referral_credit: (referredProfiles[0].referral_credit || 0) + reward,
    });
  await notify(ref.referrer_user_id, {
    type: "referral",
    title: `You earned ${money(reward)} in credit! 🎉`,
    body: `${ref.referred_name} completed their first booking. Your credit applies automatically to your next booking.`,
    link: "/buyer",
  });
  await notify(ref.referred_user_id, {
    type: "referral",
    title: `${money(reward)} credit unlocked! 🎉`,
    body: `Thanks for joining through ${ref.referrer_name}'s invite — your credit applies automatically to your next booking.`,
    link: "/buyer",
  });
}