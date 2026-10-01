import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Grants an account its role. This is the ONLY place app_role is set: the
// browser says which role the user picked, and the server re-checks every rule
// (allowed role, age for that role, California ZIP) before writing it. A client
// can therefore never assign itself a role it isn't eligible for, and the role
// can be set once — it is never swapped afterwards.

const ALLOWED_ROLES = ['teen', 'parent', 'buyer'];

// California ZIPs run 90001–96162; no other state uses that block.
function isCaliforniaZip(zip: string): boolean {
  if (!/^\d{5}$/.test(zip)) return false;
  const n = Number(zip);
  return n >= 90001 && n <= 96162;
}

// Age computed on the server from YYYY-MM-DD — never trusted from the client.
function calcAge(dob: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const d = new Date(`${dob}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  if (d.getTime() > now.getTime()) return null;
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - d.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < d.getUTCDate())) age -= 1;
  return age;
}

function isRealName(value: string, email: string): boolean {
  const v = String(value || '').trim();
  if (v.length < 2 || v.length > 60) return false;
  if (!/[A-Za-z]{2}/.test(v)) return false;
  if (!/^[A-Za-z][A-Za-z'’.\- ]*$/.test(v)) return false;
  const username = String(email || '').split('@')[0].trim().toLowerCase();
  if (username && v.toLowerCase() === username) return false;
  return true;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body: any = await req.json().catch(() => ({}));
    const role = String(body?.role || '').toLowerCase().trim();
    if (!ALLOWED_ROLES.includes(role)) {
      return Response.json({ error: 'Choose a valid account type.' }, { status: 400 });
    }

    const firstName = String(body?.firstName || '').trim();
    const lastName = String(body?.lastName || '').trim();
    const dob = String(body?.dateOfBirth || '').trim();
    const zip = String(body?.zip || '').trim();
    const state = String(body?.state || '').trim().toUpperCase();

    // --- Re-check everything the browser checked ---
    const age = calcAge(dob);
    if (age === null) {
      return Response.json({ error: 'Enter a valid date of birth.' }, { status: 400 });
    }

    if (role === 'teen') {
      if (age < 13) {
        return Response.json({ error: 'Blockwork is for teens 13 and older.' }, { status: 400 });
      }
      if (age >= 18) {
        return Response.json(
          { error: 'At 18 you join as an independent account instead of a teen account.' },
          { status: 400 }
        );
      }
      if (state && state !== 'CA') {
        return Response.json({ error: 'Blockwork is currently only available in California.' }, { status: 400 });
      }
      if (zip && !isCaliforniaZip(zip)) {
        return Response.json({ error: 'Enter a 5-digit California ZIP code.' }, { status: 400 });
      }
      if (firstName && !isRealName(firstName, user.email)) {
        return Response.json({ error: 'Enter your real first name — letters only, not your email address.' }, { status: 400 });
      }
    } else {
      if (age < 18) {
        return Response.json({ error: 'You must be at least 18 years old for this account type.' }, { status: 400 });
      }
      if (role === 'parent' && !isRealName(firstName, user.email)) {
        return Response.json({ error: 'Enter your legal first and last name — letters only.' }, { status: 400 });
      }
      if (role === 'buyer') {
        if (!isRealName(firstName, user.email) || !isRealName(lastName, user.email)) {
          return Response.json({ error: 'Enter your first and last name — letters only, not your email address.' }, { status: 400 });
        }
        if (!isCaliforniaZip(zip)) {
          return Response.json({ error: 'Blockwork is currently only available in California.' }, { status: 400 });
        }
      }
    }

    // A parent account only exists behind a confirmed link, which confirmParentLink
    // creates server-side after Stripe verifies the adult.
    if (role === 'parent') {
      const links = await base44.asServiceRole.entities.ParentTeenLink.filter({
        parent_user_id: user.id,
        status: 'confirmed',
      });
      if (!links || !links.length) {
        return Response.json({ error: 'Link to your teen before finishing parent setup.' }, { status: 403 });
      }
    }

    // --- The existing role is authoritative: set once, never swapped ---
    const existingRole = String(user.app_role || '').toLowerCase();
    if (existingRole && existingRole !== role) {
      return Response.json({ error: 'Your account already has a role.' }, { status: 403 });
    }
    if (existingRole === role && user.onboarded) {
      return Response.json({ ok: true, role, alreadySet: true });
    }

    await base44.asServiceRole.entities.User.update(user.id, {
      app_role: role,
      onboarded: true,
      date_of_birth: dob,
      ...(state ? { work_state: state } : {}),
    });

    return Response.json({ ok: true, role });
  } catch (error: any) {
    console.error('saveSignupRole failed:', error?.message || error);
    return Response.json({ error: 'Something went wrong saving your account type.' }, { status: 500 });
  }
}