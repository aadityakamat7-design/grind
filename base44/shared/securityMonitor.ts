// Security event monitoring — logs suspicious activity and alerts admins.
// Used by rate-limited endpoints to record failures, and by the webhook
// handler to alert on signature verification failures.
import { notifyAdmins } from './notifyAdmins.ts';

// Records a security event as an admin notification. Events are also logged
// to the server console for debugging. This is the single entry point for
// all "alert an admin" security monitoring across the app.
export async function alertSecurityEvent(base44, event: {
  type: string;
  title: string;
  body: string;
  link?: string;
}) {
  console.warn(`[SECURITY] ${event.type}: ${event.title} — ${event.body}`);
  try {
    await notifyAdmins(base44, {
      type: 'safety',
      title: event.title,
      body: event.body,
      link: event.link || '/admin',
    });
  } catch (err) {
    console.error('Failed to send security alert:', err.message);
  }
}

// Thresholds for repeated-failure alerts. These are intentionally low — we'd
// rather over-alert on suspicious patterns than miss a real attack.
export const SECURITY_THRESHOLDS = {
  FAILED_LOGIN_ALERT: 5,        // alert after 5 failed logins from one IP
  FAILED_CODE_LOOKUP_ALERT: 5,  // alert after 5 failed code lookups from one IP
  FAILED_PAYOUT_ALERT: 3,       // alert after 3 failed payout attempts
};