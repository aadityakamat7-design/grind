import { base44 } from "@/api/base44Client";

// Create an in-app notification for a user. Safe no-op if userId missing.
// Best-effort client-side notification. Catches errors silently so a failed
// notification (e.g. RLS blocks creating notifications for other users) never
// breaks the main flow. Critical notifications (safety alerts, reschedules,
// cancellations) are sent server-side via dedicated backend functions.
export async function notify(userId, { type = "general", title, body = "", link = "" }) {
  if (!userId) return;
  try {
    await base44.entities.Notification.create({ user_id: userId, type, title, body, link, read: false });
  } catch {
    // RLS may block creating notifications for other users — server functions handle those
  }
}