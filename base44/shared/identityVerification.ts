// RETIRED — Stripe Identity verification has been removed. Parents are now
// verified through Stripe Connect Express onboarding (legal name, DOB, SSN,
// bank account, 18+), checked server-side via isParentVerifiedByStripe in
// base44/shared/parentVerification.ts.
//
// This module is kept only for backward compatibility with any code that
// imports it. markParentVerified now marks the parent as verified based on
// their Connect account status (called from checkConnectStatus when the
// account becomes active). applyVerifiedIdentity is removed.

// Marks a parent as verified based on their Stripe Connect account status.
// Surfaces the trust signal on any linked teen profiles.
export async function markParentVerified(base44, userId, extra = {}, fullName = '') {
  const profiles = await base44.asServiceRole.entities.ParentProfile.filter({ user_id: userId });
  let profile = profiles[0];
  const update = {
    identity_status: 'verified', // legacy field — now means "Connect-verified"
    is_identity_verified: true,  // legacy field — now means "Connect-verified"
    verified_at: new Date().toISOString(),
    ...extra,
  };
  if (profile) {
    await base44.asServiceRole.entities.ParentProfile.update(profile.id, update);
  } else {
    profile = await base44.asServiceRole.entities.ParentProfile.create({
      user_id: userId,
      full_name: fullName,
      ...update,
    });
  }

  // Surface the verified flag on every linked teen profile.
  const links = await base44.asServiceRole.entities.ParentTeenLink.filter({ parent_user_id: userId });
  for (const link of links) {
    await base44.asServiceRole.entities.ParentTeenLink.update(link.id, {
      identity_verified: true,
      status: 'confirmed',
      ...(link.confirmed_at ? {} : { confirmed_at: new Date().toISOString() }),
    });
    if (link.teen_profile_id) {
      await base44.asServiceRole.entities.TeenProfile.update(link.teen_profile_id, {
        parent_identity_verified: true,
        status: 'active',
      });
    }
  }
  return profile;
}