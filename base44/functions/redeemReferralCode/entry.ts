import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Redeems a referral code during onboarding. Looks up the referrer by code
// (checking both BuyerProfile and TeenProfile) using service role, since
// BuyerProfile RLS restricts reads to owner+admin and a new user can't
// read another user's profile to find the referrer. The client never sees
// the referrer's profile data — only whether the redemption succeeded.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { code } = await req.json();
    const cleaned = (code || '').trim().toUpperCase();
    if (!cleaned) return Response.json({ redeemed: false });

    const svc = base44.asServiceRole.entities;
    const [buyerMatches, teenMatches] = await Promise.all([
      svc.BuyerProfile.filter({ referral_code: cleaned }),
      svc.TeenProfile.filter({ referral_code: cleaned }),
    ]);
    const referrer = buyerMatches[0] || teenMatches[0];
    if (!referrer || referrer.user_id === user.id) {
      return Response.json({ redeemed: false });
    }

    const existing = await svc.Referral.filter({ referred_user_id: user.id });
    if (existing.length > 0) return Response.json({ redeemed: false });

    await svc.Referral.create({
      referrer_user_id: referrer.user_id,
      referrer_name: (referrer.full_name || referrer.display_name)?.split(' ')[0] || 'A neighbor',
      code: cleaned,
      referred_user_id: user.id,
      referred_name: user.full_name?.split(' ')[0] || 'Your friend',
      reward_amount: 10,
      status: 'pending',
    });
    return Response.json({ redeemed: true });
  } catch (error) {
    console.error('redeemReferralCode error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});