import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// "Change role" during sign-up: clears the age check (role + date of birth) so the
// person starts again at the age screen, keeping the same account and email.
// Only allowed while the account is still at the first step — once the profile is
// saved the role is fixed.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'You are signed out. Sign in again to continue.' }, { status: 401 });

    if (user.app_role || (user.onboarding_step && user.onboarding_step !== 'account_created')) {
      return Response.json({ error: 'Your profile is already saved, so your account type can no longer be changed.' }, { status: 403 });
    }

    await base44.asServiceRole.entities.User.update(user.id, {
      signup_role: null,
      date_of_birth: null,
      work_state: null,
      signup_claimed_at: null,
      onboarding_step: null,
    });
    return Response.json({ ok: true });
  } catch (error: any) {
    console.error('resetSignup failed:', error?.message || error);
    return Response.json({ error: "Couldn't go back a step. Check your connection and try again." }, { status: 500 });
  }
});