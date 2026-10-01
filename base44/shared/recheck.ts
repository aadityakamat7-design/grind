// The 15-minute rule for sensitive changes.
//
// Anyone can change their name, photo, phone or notifications freely. Changing
// the email, the password, a legal name tied to a payout account, or a parent's
// payout details needs the person to prove it is really them — but only if they
// haven't proved it in the last 15 minutes. Signing in counts as proof
// (claimSignup stamps this), and so does re-entering the password.

export const RECHECK_WINDOW_MS = 15 * 60 * 1000;

/** True when the person proved who they are within the last 15 minutes. */
export async function isRecheckFresh(svc: any, userId: string): Promise<boolean> {
  try {
    const rows = await svc.AccountSettings.filter({ user_id: userId });
    const last = rows[0]?.last_verified_at;
    if (!last) return false;
    const at = new Date(last).getTime();
    if (!Number.isFinite(at)) return false;
    return Date.now() - at <= RECHECK_WINDOW_MS;
  } catch (err) {
    console.error('isRecheckFresh failed:', err?.message);
    return false;
  }
}

/** Stamps "this person just proved it's them" on the account. */
export async function markVerifiedNow(svc: any, userId: string): Promise<void> {
  try {
    const iso = new Date().toISOString();
    const rows = await svc.AccountSettings.filter({ user_id: userId });
    if (rows[0]) {
      await svc.AccountSettings.update(rows[0].id, { last_verified_at: iso });
    } else {
      await svc.AccountSettings.create({ user_id: userId, last_verified_at: iso });
    }
  } catch (err) {
    console.error('markVerifiedNow failed:', err?.message);
  }
}

/**
 * Checks the password the person just typed. Uses the platform's own sign-in so
 * there is exactly one place a password is judged.
 */
export async function verifyCurrentPassword(base44: any, email: string, password: string) {
  if (!password) return { ok: false as const, error: 'Enter your password to continue.' };
  try {
    await base44.auth.loginViaEmailPassword(email, password);
    return { ok: true as const };
  } catch (err: any) {
    console.error('verifyCurrentPassword failed:', err?.message);
    return { ok: false as const, error: 'That password is not correct.' };
  }
}

/**
 * The gate every sensitive change runs through.
 * Returns { ok: true } when the change may proceed, otherwise an error to show.
 * `password` is only needed when the last proof is older than 15 minutes.
 */
export async function requireRecheck(
  base44: any,
  svc: any,
  user: any,
  password: string | undefined,
  actionLabel: string,
) {
  if (await isRecheckFresh(svc, user.id)) return { ok: true as const };

  const method = String(user.auth_method || 'password').toLowerCase();
  if (method === 'password') {
    const check = await verifyCurrentPassword(base44, user.email, String(password || ''));
    if (!check.ok) {
      return {
        ok: false as const,
        status: 401,
        code: 'recheck_required',
        error: `${check.error} For your safety, ${actionLabel} needs your password if you signed in more than 15 minutes ago.`,
      };
    }
    await markVerifiedNow(svc, user.id);
    return { ok: true as const };
  }

  return {
    ok: false as const,
    status: 401,
    code: 'recheck_required',
    provider: method,
    error: `For your safety, ${actionLabel} needs you to sign in again if it has been more than 15 minutes.`,
  };
}