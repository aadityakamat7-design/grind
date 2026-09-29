// One place that decides what a suspended account may do, so every gate agrees.
//
// Suspension is a safety control, not a punishment: a suspended account can
// still sign in and see its own records, and work that was already agreed and
// paid for stays in place. What it cannot do is start anything new — take a
// job, hire a teen, post a job, approve a booking, publish a listing, or
// message anyone. Support ends work already in flight with the booking tools
// (cancel, hold payout, resolve), which is where the audit trail belongs.
//
// The flag lives on the User record as account_status and is written only by
// the adminSetAccountSuspension function.

export const SUSPENDED_MESSAGE =
  'Your Blockwork account is on hold, so new jobs, bookings, listings and messages are paused while our team reviews it. Anything already booked is unaffected. Contact support if you think this is a mistake.';

// Reads the flag off the user record the handler already fetched, so a gate
// never costs an extra database read.
export function isAccountSuspended(user: any): boolean {
  return user?.account_status === 'suspended';
}

// Ready-made refusal. Handlers use it as a single line:
//   if (isAccountSuspended(user)) return suspendedError();
export function suspendedError() {
  return Response.json({ error: SUSPENDED_MESSAGE, suspended: true }, { status: 403 });
}