// Sends an in-app notification to every admin user. Server-side only (uses
// asServiceRole to list admins, which regular users cannot do).
export async function notifyAdmins(base44, { type, title, body, link }) {
  const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
  await Promise.all(
    admins.map((admin) =>
      base44.asServiceRole.entities.Notification.create({
        user_id: admin.id,
        type,
        title,
        body,
        link,
        read: false,
      })
    )
  );
}