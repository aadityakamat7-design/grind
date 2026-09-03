// Sends a transaction notification email to the app owner.
// Server-side only. Delivery to a non-registered address requires a
// connected custom domain on a paid plan; failures are logged but never throw
// so a notification can't break the transaction it reports on.
const OWNER_EMAIL = 'aaditya.kamat7@gmail.com';

export async function notifyOwnerTransaction(base44, { type, title, details }) {
  const body = [
    `A ${type} just occurred on Blockwork:`,
    '',
    title,
    '',
    'Details:',
    details,
    '',
    `Time: ${new Date().toISOString()}`,
    '',
    '— Blockwork',
  ].join('\n');

  try {
    await base44.integrations.Core.SendEmail({
      to: OWNER_EMAIL,
      subject: `[Blockwork] ${type}: ${title}`,
      body,
    });
  } catch (e) {
    console.error('notifyOwnerTransaction email failed:', e.message);
  }
}