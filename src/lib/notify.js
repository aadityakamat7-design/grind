import { base44 } from "@/api/base44Client";

// Create an in-app notification for a user. Safe no-op if userId missing.
export async function notify(userId, { type = "general", title, body = "", link = "" }) {
  if (!userId) return;
  await base44.entities.Notification.create({ user_id: userId, type, title, body, link, read: false });
}