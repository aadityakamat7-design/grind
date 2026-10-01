import { getVerifiedAge } from './teenAge.ts';

// A teen under 18 may not work until a parent or guardian is linked and
// confirmed. An independent 18+ teen needs no parent link — their own payout
// account is their adult check. Every function that lets a teen work (publish a
// service, take a job, be booked) resolves eligibility through here, so the
// rule lives in one place and a direct API call can't bypass it.
export const PARENT_LINK_REQUIRED =
  'Link your parent to start working. Share your code with your parent or guardian — once they link, you can post services and take jobs, and they approve each one.';

export type WorkEligibility = {
  profile: any;
  link: any;
  age: number | null;
  isIndependentAdult: boolean;
  hasParent: boolean;
  canWork: boolean;
};

export async function resolveWorkEligibility(svc: any, teenUserId: string): Promise<WorkEligibility> {
  const [profiles, links, privateRecords] = await Promise.all([
    svc.TeenProfile.filter({ user_id: teenUserId }),
    svc.ParentTeenLink.filter({ teen_user_id: teenUserId, status: 'confirmed' }),
    svc.TeenPrivateData.filter({ user_id: teenUserId }),
  ]);
  const profile = profiles[0] || null;
  const link = links[0] || null;
  const age = getVerifiedAge(privateRecords[0]);
  const isIndependentAdult = age != null && age >= 18;
  return {
    profile,
    link,
    age,
    isIndependentAdult,
    hasParent: !!link,
    canWork: !!link || isIndependentAdult,
  };
}