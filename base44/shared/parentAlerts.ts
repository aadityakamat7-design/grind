// Parent-facing safety alerts: in-app notification plus email. Used by the
// check-in / check-out flow, the missed-check-in monitor, the SOS button and
// the message safety monitor. Email goes to a registered app user (the parent)
// through the platform's SendEmail integration.
import { emailFooter } from './emailFooter.ts';
import { APP_BASE_URL } from './safeOrigin.ts';

async function parentUser(base44, parentUserId: string) {
  try {
    const rows = await base44.asServiceRole.entities.User.filter({ id: parentUserId });
    return rows[0] || null;
  } catch {
    return null;
  }
}

async function notify(base44, parentUserId: string, { type, title, body, link, emailSubject, emailBody }) {
  if (!parentUserId) return;
  try {
    await base44.asServiceRole.entities.Notification.create({
      user_id: parentUserId,
      type,
      title,
      body,
      link,
      read: false,
    });
  } catch (err) {
    console.error('parent alert notification failed:', err?.message);
  }
  if (!emailSubject) return;
  try {
    const parent = await parentUser(base44, parentUserId);
    if (!parent?.email) return;
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: parent.email,
      subject: emailSubject,
      body: `${emailBody}${emailFooter(APP_BASE_URL)}`,
    });
  } catch (err) {
    console.error('parent alert email failed:', err?.message);
  }
}

function clock(dateLike) {
  try {
    return new Date(dateLike).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/Los_Angeles',
    });
  } catch {
    return '';
  }
}

export async function alertParentCheckIn(base44, opts: {
  parentUserId: string;
  teenName: string;
  jobTitle: string;
  buyerName: string;
  at: string;
  locationConfirmed: boolean;
  bookingId: string;
}) {
  const { parentUserId, teenName, jobTitle, buyerName, at, locationConfirmed, bookingId } = opts;
  const place = buyerName ? `${buyerName}'s` : 'the job site';
  const when = clock(at);
  const suffix = locationConfirmed ? '' : ' — Location not confirmed.';
  await notify(base44, parentUserId, {
    type: 'safety',
    title: `${teenName} arrived at ${jobTitle}`,
    body: `${teenName} arrived at the ${place} for ${jobTitle}, ${when}.${suffix}`,
    link: `/bookings/${bookingId}`,
    emailSubject: `${teenName} arrived — ${jobTitle}`,
    emailBody:
      `Hi,\n\n${teenName} checked in at the ${place} for "${jobTitle}" at ${when}.${suffix}\n\n` +
      `View the job: ${APP_BASE_URL}/bookings/${bookingId}\n`,
  });
}

export async function alertParentCheckOut(base44, opts: {
  parentUserId: string;
  teenName: string;
  jobTitle: string;
  at: string;
  locationConfirmed: boolean;
  bookingId: string;
}) {
  const { parentUserId, teenName, jobTitle, at, locationConfirmed, bookingId } = opts;
  const when = clock(at);
  const suffix = locationConfirmed ? '' : ' — Location not confirmed.';
  await notify(base44, parentUserId, {
    type: 'safety',
    title: `${teenName} finished and is heading home`,
    body: `${teenName} checked out of ${jobTitle} at ${when} and is heading home.${suffix}`,
    link: `/bookings/${bookingId}`,
    emailSubject: `${teenName} is heading home — ${jobTitle}`,
    emailBody:
      `Hi,\n\n${teenName} checked out of "${jobTitle}" at ${when} and is heading home.${suffix}\n\n` +
      `View the job: ${APP_BASE_URL}/bookings/${bookingId}\n`,
  });
}

export async function alertParentMissedCheckIn(base44, opts: {
  parentUserId: string;
  teenName: string;
  jobTitle: string;
  buyerName: string;
  bookingId: string;
}) {
  const { parentUserId, teenName, jobTitle, buyerName, bookingId } = opts;
  await notify(base44, parentUserId, {
    type: 'safety',
    title: `${teenName} hasn't checked in yet`,
    body: `${teenName} hasn't checked in for "${jobTitle}"${buyerName ? ` at ${buyerName}'s` : ''}, 15 minutes after the start time.`,
    link: `/bookings/${bookingId}`,
    emailSubject: `${teenName} hasn't checked in — ${jobTitle}`,
    emailBody:
      `Hi,\n\n${teenName}'s job "${jobTitle}"${buyerName ? ` at ${buyerName}'s` : ''} was due to start 15 minutes ago ` +
      `and they haven't checked in yet. We reminded them to check in.\n\n` +
      `View the job: ${APP_BASE_URL}/bookings/${bookingId}\n`,
  });
}

export async function alertParentOverdueCheckOut(base44, opts: {
  parentUserId: string;
  teenName: string;
  jobTitle: string;
  bookingId: string;
}) {
  const { parentUserId, teenName, jobTitle, bookingId } = opts;
  await notify(base44, parentUserId, {
    type: 'safety',
    title: `${teenName} hasn't checked out yet`,
    body: `${teenName} hasn't marked "${jobTitle}" as done, 30 minutes after the scheduled end time.`,
    link: `/bookings/${bookingId}`,
    emailSubject: `${teenName} hasn't checked out — ${jobTitle}`,
    emailBody:
      `Hi,\n\n${teenName} hasn't checked out of "${jobTitle}" — it's now 30 minutes past the scheduled end time. ` +
      `Checking out is how ${teenName} tells you they're heading home.\n\n` +
      `View the job: ${APP_BASE_URL}/bookings/${bookingId}\n`,
  });
}

// SOS: in-app + email, with the location, the job, the address and the
// neighbor's name so the parent can act immediately.
export async function alertParentSOS(base44, opts: {
  parentUserId: string;
  teenName: string;
  jobTitle: string;
  buyerName: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  bookingId: string;
}) {
  const { parentUserId, teenName, jobTitle, buyerName, address, lat, lng, bookingId } = opts;
  const mapLink = lat != null && lng != null ? `\nLive location: https://maps.google.com/?q=${lat},${lng}` : '';
  await notify(base44, parentUserId, {
    type: 'safety',
    title: `SOS — ${teenName} needs help`,
    body: `${teenName} pressed SOS during "${jobTitle}"${buyerName ? ` at ${buyerName}'s` : ''}${address ? ` (${address})` : ''}. Call them now.`,
    link: `/bookings/${bookingId}`,
    emailSubject: `SOS — ${teenName} pressed the emergency button`,
    emailBody:
      `Hi,\n\n${teenName} pressed the SOS button during "${jobTitle}".\n\n` +
      `Job: ${jobTitle}\nNeighbor: ${buyerName || 'unknown'}\nAddress: ${address || 'not provided'}\n` +
      `Time: ${clock(new Date().toISOString())}${mapLink}\n\n` +
      `If they are in danger, call 911. Blockwork also alerted our safety team.\n\n` +
      `View the job: ${APP_BASE_URL}/bookings/${bookingId}\n`,
  });
}

export async function alertParentSafeNow(base44, opts: {
  parentUserId: string;
  teenName: string;
  bookingId: string;
}) {
  const { parentUserId, teenName, bookingId } = opts;
  await notify(base44, parentUserId, {
    type: 'safety',
    title: `${teenName} says they're safe`,
    body: `${teenName} tapped "I'm safe now" after their SOS alert.`,
    link: `/bookings/${bookingId}`,
    emailSubject: `${teenName} says they're safe`,
    emailBody: `Hi,\n\n${teenName} tapped "I'm safe now" after their SOS alert. You can reach them in the app.\n`,
  });
}

export async function alertParentFlaggedMessage(base44, opts: {
  parentUserId: string;
  teenName: string;
  severity: string;
  jobTitle?: string;
  threadId: string;
  action: string;
}) {
  const { parentUserId, teenName, severity, jobTitle, threadId, action } = opts;
  const outcome =
    action === 'blocked'
      ? 'It was blocked and our safety team has been alerted.'
      : action === 'held'
        ? 'It was held and our safety team is reviewing it before it can be delivered.'
        : 'The contact details in it were hidden.';
  await notify(base44, parentUserId, {
    type: 'safety',
    title: `Flagged message involving ${teenName}`,
    body: `A message in ${jobTitle ? `"${jobTitle}"` : 'a conversation'} was flagged as ${severity} risk. ${outcome}`,
    link: `/messages/${threadId}`,
    emailSubject: `Flagged message involving ${teenName}`,
    emailBody:
      `Hi,\n\nA message involving ${teenName}${jobTitle ? ` about "${jobTitle}"` : ''} was flagged by our safety monitor ` +
      `and marked ${severity} risk. ${outcome}\n\n` +
      `You can see the flagged messages on your dashboard: ${APP_BASE_URL}/parent\n`,
  });
}