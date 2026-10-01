// Every email a change to someone's own account produces, in one place:
//   - the confirmation link that has to be clicked before a new email address
//     takes effect (sent to the NEW address)
//   - the "your X was changed" notice (sent to the address being replaced,
//     with a one-tap "this wasn't me" link that files an urgent report)
//   - the password-changed notice
import { emailFooter } from './emailFooter.ts';
import { APP_BASE_URL } from './safeOrigin.ts';

/** Creates the alert row and returns the one-time token for the notice email. */
export async function createAccountAlert(svc: any, opts: {
  userId: string;
  changeType: 'email' | 'name' | 'password' | 'address' | 'payout' | 'teen_control';
  detail: string;
}) {
  const token = crypto.randomUUID().replace(/-/g, '');
  try {
    await svc.AccountAlert.create({
      user_id: opts.userId,
      change_type: opts.changeType,
      detail: opts.detail.slice(0, 300),
      token,
    });
  } catch (err) {
    console.error('createAccountAlert failed:', err?.message);
  }
  return token;
}

/** "Your email was changed" — sent to the address that is being replaced. */
export async function sendChangeNotice(base44: any, opts: {
  to: string;
  name?: string;
  what: string;
  detail: string;
  token: string;
  origin?: string;
}) {
  if (!opts.to) return;
  const origin = opts.origin || APP_BASE_URL;
  const link = `${origin}/account-alert?token=${opts.token}`;
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: opts.to,
      subject: `Your Blockwork ${opts.what} was changed`,
      body:
        `Hi ${opts.name || ''},\n\n` +
        `Your ${opts.what} on Blockwork was changed: ${opts.detail}\n\n` +
        `If this wasn't you, tell us right away — one tap files an urgent report with our safety team:\n${link}\n\n` +
        `If you didn't make this change, also change your password immediately: ${origin}/account\n` +
        emailFooter(origin),
    });
  } catch (err) {
    console.error('sendChangeNotice failed:', err?.message);
  }
}

/** The confirmation link for a new email address — sent to that address. */
export async function sendEmailChangeConfirmation(base44: any, opts: {
  to: string;
  name?: string;
  token: string;
  origin?: string;
}) {
  const origin = opts.origin || APP_BASE_URL;
  const link = `${origin}/account-email?token=${opts.token}`;
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: opts.to,
      subject: 'Confirm your new Blockwork email',
      body:
        `Hi ${opts.name || ''},\n\n` +
        `Confirm this address to start using it for your Blockwork bookings, receipts and safety notices:\n${link}\n\n` +
        `This link works once and expires in 24 hours. Nothing changes until you tap it.\n` +
        `If you didn't ask for this, you can ignore this email — your current address stays as it is.` +
        emailFooter(origin),
    });
  } catch (err) {
    console.error('sendEmailChangeConfirmation failed:', err?.message);
  }
}