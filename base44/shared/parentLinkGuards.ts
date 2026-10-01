// Guards against a teen becoming their own "parent" with a second account.
//
// BLOCKED (a different email string, the same inbox behind it): the same
// address, the same address with a +suffix (name+1@gmail.com), or a Gmail
// address that differs only by dots — all deliver to the same person.
//
// FLAGGED, never blocked: a parent account created on the same device or IP as
// the teen's within 24 hours. Families really do share a phone and a home
// network, so this is surfaced to admins as "Possible self-linked parent"
// instead of being refused.
const GMAIL_DOMAINS = ['gmail.com', 'googlemail.com'];

export function emailsAreSameOwner(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const na = String(a).trim().toLowerCase();
  const nb = String(b).trim().toLowerCase();
  if (!na || !nb) return false;
  if (na === nb) return true;
  const [localA, domainA] = na.split('@');
  const [localB, domainB] = nb.split('@');
  if (!localA || !localB || !domainA || !domainB) return false;
  if (domainA !== domainB) return false;
  const baseA = localA.split('+')[0];
  const baseB = localB.split('+')[0];
  if (GMAIL_DOMAINS.includes(domainA)) {
    return baseA.replace(/\./g, '') === baseB.replace(/\./g, '');
  }
  return baseA === baseB;
}

// True when the parent account was created within 24 hours of the teen's AND
// the registration came from the same IP or the same device. The registering
// IP and user agent are recorded server-side at sign-up (secureAuth), never
// taken from the browser at link time.
export async function looksLikeSelfLinkedParent(opts: {
  svc: any;
  parentUser: any;
  teenUser: any;
  parentIp?: string;
  userAgent?: string;
}): Promise<boolean> {
  const { svc, parentUser, teenUser, parentIp, userAgent } = opts;
  if (!parentUser?.created_date || !teenUser?.created_date) return false;
  const gap = Math.abs(
    new Date(parentUser.created_date).getTime() - new Date(teenUser.created_date).getTime()
  );
  if (gap > 24 * 60 * 60 * 1000) return false;

  const attempts = await svc.AuthAttempt.filter(
    { user_id: teenUser.id, action: 'register' },
    '-created_date',
    5
  );
  const registration = attempts[0];
  if (!registration) return false;

  const sameIp =
    !!registration.ip && registration.ip !== 'unknown' &&
    !!parentIp && parentIp !== 'unknown' && registration.ip === parentIp;
  const sameDevice =
    !!registration.user_agent && !!userAgent && registration.user_agent === userAgent;

  return sameIp || sameDevice;
}