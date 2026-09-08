// Immutable audit logging for sensitive actions (payouts, approvals, role
// changes, admin actions). Every entry is written via the service role so it
// bypasses RLS; the AuditLog entity itself is admin-read-only and should never
// be updated or deleted (immutability enforced by convention — no code path
// mutates an audit record after creation).
//
// Usage:
//   await writeAuditLog(base44, {
//     actor_user_id: user.id,
//     actor_role: user.app_role || 'user',
//     action: 'payout_transferred',
//     category: 'payout',
//     target_type: 'Booking',
//     target_id: booking.id,
//     summary: `Transferred $${amount} to parent ${parentName}`,
//     metadata: { amount, booking_status: booking.status },
//     ip: getClientIp(req),
//   });

export async function writeAuditLog(base44, entry: {
  actor_user_id: string;
  actor_role?: string;
  action: string;
  category: 'payout' | 'approval' | 'admin' | 'security' | 'auth';
  target_type?: string;
  target_id?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}) {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      actor_user_id: entry.actor_user_id,
      actor_role: entry.actor_role || 'system',
      action: entry.action,
      category: entry.category,
      target_type: entry.target_type || '',
      target_id: entry.target_id || '',
      summary: entry.summary || '',
      metadata: entry.metadata || {},
      ip: entry.ip || '',
    });
  } catch (err) {
    // Audit logging must never break the calling operation — but the failure
    // is itself a security signal, so log it loudly.
    console.error('[AUDIT] Failed to write audit log:', err.message, entry.action);
  }
}