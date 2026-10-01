// Notification preferences live on AccountSettings.notifications, one switch
// per type for email and in-app. Security and account notices (password
// changed, suspicious sign-in) are deliberately NOT in this list: they can
// never be turned off.

export const NOTIFICATION_TYPES = [
  'bookings',
  'messages',
  'approvals',
  'payouts',
  'reports',
  'weekly_summary',
  'marketing',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationChannel = 'email' | 'in_app';
export type NotificationPrefs = Record<NotificationType, { email: boolean; in_app: boolean }>;

export function defaultNotifications(): NotificationPrefs {
  const prefs = {} as NotificationPrefs;
  for (const type of NOTIFICATION_TYPES) {
    prefs[type] = { email: true, in_app: true };
  }
  return prefs;
}

/** Fills in anything missing so older accounts always have a complete set. */
export function normalizeNotifications(input: unknown): NotificationPrefs {
  const prefs = defaultNotifications();
  const raw = (input || {}) as Record<string, any>;
  for (const type of NOTIFICATION_TYPES) {
    const pair = raw[type];
    if (!pair || typeof pair !== 'object') continue;
    prefs[type] = {
      email: pair.email !== false,
      in_app: pair.in_app !== false,
    };
  }
  return prefs;
}

/** Reads (or creates) the settings row for an account. */
export async function loadAccountSettings(svc: any, userId: string) {
  const rows = await svc.AccountSettings.filter({ user_id: userId });
  if (rows[0]) return rows[0];
  try {
    return await svc.AccountSettings.create({ user_id: userId, notifications: defaultNotifications() });
  } catch (err) {
    console.error('loadAccountSettings create failed:', err?.message);
    return null;
  }
}

/**
 * Should this notification actually be sent? Used by the senders so a person's
 * choices are honoured instead of being stored and ignored.
 */
export async function notificationAllowed(
  svc: any,
  userId: string,
  type: NotificationType,
  channel: NotificationChannel,
): Promise<boolean> {
  try {
    const rows = await svc.AccountSettings.filter({ user_id: userId });
    const prefs = normalizeNotifications(rows[0]?.notifications);
    return prefs[type][channel];
  } catch (err) {
    // Never let a preference lookup block a real notification.
    console.error('notificationAllowed failed:', err?.message);
    return true;
  }
}