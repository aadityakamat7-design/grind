// The sign-up age and role rules, checked on the server every time — the
// browser repeats them only to give instant feedback.

export const SIGNUP_ROLES = ['teen', 'parent', 'buyer'];

export const UNDERAGE_MESSAGE = 'You need to be 13 or older to use Blockwork.';

// Age computed from YYYY-MM-DD — never trusted from the client.
export function calcAge(dob: string | undefined | null): number | null {
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const d = new Date(`${dob}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  if (d.getTime() > now.getTime()) return null;
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - d.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < d.getUTCDate())) age -= 1;
  if (age > 110) return null;
  return age;
}

// Returns an error message when this role is not allowed at this age, else null.
export function checkRoleAge(role: string, age: number): { error: string; code: string } | null {
  if (age < 13) return { error: UNDERAGE_MESSAGE, code: 'underage' };
  if (role === 'teen') {
    if (age > 19) {
      return { error: 'Teen accounts are for ages 13–19. If you are an adult, sign up as a neighbor or a parent instead.', code: 'role_age' };
    }
    return null;
  }
  if (age < 18) {
    return { error: 'You must be at least 18 to sign up as a parent or neighbor.', code: 'role_age' };
  }
  return null;
}