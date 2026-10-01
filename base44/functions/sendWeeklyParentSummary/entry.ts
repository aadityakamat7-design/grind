import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { emailFooter } from '../../shared/emailFooter.ts';
import { APP_BASE_URL } from '../../shared/safeOrigin.ts';

// Weekly parent summary — runs Sunday 6 PM Pacific (workflow: WeeklyParentSummary).
//
// Jobs completed, hours, net earnings, what's coming up, anything waiting on
// approval, safety events (counts and a link only — never message text), and
// savings-goal progress. Weeks with nothing at all are skipped, and a parent
// who turned the summary off is skipped too.
const money = (n) => `$${Number(n || 0).toFixed(2)}`;

function hoursOf(b) {
  const explicit = Number(b.estimated_hours);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const minutes = Number(b.session_duration_minutes);
  if (Number.isFinite(minutes) && minutes > 0) return minutes / 60;
  return 2;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole.entities;
    const now = Date.now();
    const weekAgoIso = new Date(now - 7 * 86400000).toISOString();

    const parents = await svc.User.filter({ app_role: 'parent' }, '-created_date', 500);
    let sent = 0;
    let skipped = 0;

    for (const parent of parents) {
      try {
        if (parent.parent_weekly_summary === false) {
          skipped++;
          continue;
        }
        const links = await svc.ParentTeenLink.filter({ parent_user_id: parent.id, status: 'confirmed' });
        if (links.length === 0) {
          skipped++;
          continue;
        }
        const teenIds = links.map((l) => l.teen_user_id).filter(Boolean);
        const nameFor = (teenId) => links.find((l) => l.teen_user_id === teenId)?.teen_display_name || 'Your teen';

        const [bookings, flags, goals] = await Promise.all([
          svc.Booking.filter({ teen_user_id: { $in: teenIds } }, '-created_date', 200),
          svc.MessageFlag.filter({ parent_user_id: parent.id }, '-created_date', 100).catch(() => []),
          svc.SavingsGoal.filter({ teen_user_id: { $in: teenIds }, status: 'active' }),
        ]);

        const completedThisWeek = bookings.filter(
          (b) => b.status === 'completed' && String(b.buyer_finished_at || b.updated_date || '') >= weekAgoIso,
        );
        const hours = Math.round(completedThisWeek.reduce((s, b) => s + hoursOf(b), 0) * 10) / 10;
        const earnings = completedThisWeek.reduce((s, b) => s + (Number(b.net_amount) || 0), 0);

        const upcoming = bookings
          .filter((b) => ['confirmed', 'in_progress'].includes(b.status) && b.scheduled_start && new Date(b.scheduled_start).getTime() > now)
          .sort((a, b) => new Date(a.scheduled_start) - new Date(b.scheduled_start));
        const waitingApproval = bookings.filter((b) => b.status === 'pending_parent_approval' && b.payment_status === 'held');

        const recentFlags = flags.filter((f) => String(f.created_date || '') >= weekAgoIso);
        const safetyEvents = [
          ...recentFlags.map((f) => ({ label: `Flagged message (${f.severity})`, link: `/messages/${f.thread_id}` })),
          ...bookings
            .filter((b) => String(b.missed_checkin_alerted_at || '') >= weekAgoIso)
            .map((b) => ({ label: `Missed check-in — ${b.listing_title}`, link: `/bookings/${b.id}` })),
          ...bookings
            .filter((b) => String(b.overdue_checkout_alerted_at || '') >= weekAgoIso)
            .map((b) => ({ label: `Late check-out — ${b.listing_title}`, link: `/bookings/${b.id}` })),
          ...bookings
            .filter((b) => String(b.sos_at || '') >= weekAgoIso)
            .map((b) => ({ label: `SOS pressed — ${b.listing_title}`, link: `/bookings/${b.id}` })),
        ];

        // Savings-goal progress (net earnings since each goal started).
        const goalLines = [];
        for (const g of goals) {
          const rows = await svc.EarningsRecord.filter({ teen_user_id: g.teen_user_id }, '-occurred_at', 500);
          const from = g.created_date ? new Date(g.created_date).getTime() : 0;
          const saved = rows
            .filter((r) => !r.occurred_at || new Date(r.occurred_at).getTime() >= from)
            .reduce((s, r) => s + (Number(r.net_amount) || 0), 0);
          const match = Math.round(((Number(g.match_percent) || 0) / 100) * saved * 100) / 100;
          goalLines.push(
            `  • ${nameFor(g.teen_user_id)} — "${g.name}": ${money(saved)} of ${money(g.target_amount)}` +
              (match > 0 ? ` (your ${g.match_percent}% match: ${money(match)} — paid by you directly)` : ''),
          );
        }

        const hasActivity =
          completedThisWeek.length > 0 ||
          upcoming.length > 0 ||
          waitingApproval.length > 0 ||
          safetyEvents.length > 0 ||
          goalLines.length > 0;
        if (!hasActivity) {
          skipped++;
          continue;
        }

        const lines = [`Hi ${parent.full_name || ''},`, '', "Here's your Blockwork week.", ''];

        lines.push('JOBS THIS WEEK');
        if (completedThisWeek.length === 0) {
          lines.push('  • No jobs completed this week.');
        } else {
          lines.push(`  • ${completedThisWeek.length} job${completedThisWeek.length > 1 ? 's' : ''} completed`);
          lines.push(`  • ${hours}h worked`);
          lines.push(`  • ${money(earnings)} earned (net, into the Blockwork Wallet)`);
        }
        lines.push('');

        if (waitingApproval.length > 0) {
          lines.push(`WAITING ON YOU (${waitingApproval.length})`);
          for (const b of waitingApproval.slice(0, 5)) {
            lines.push(`  • ${nameFor(b.teen_user_id)} — ${b.listing_title} from ${b.buyer_name || 'a neighbor'}`);
          }
          lines.push(`  Approve or deny: ${APP_BASE_URL}/parent/approvals`);
          lines.push('');
        }

        if (upcoming.length > 0) {
          lines.push('UPCOMING');
          for (const b of upcoming.slice(0, 5)) {
            const when = new Date(b.scheduled_start).toLocaleString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
              timeZone: 'America/Los_Angeles',
            });
            lines.push(`  • ${nameFor(b.teen_user_id)} — ${b.listing_title}, ${when}`);
          }
          lines.push('');
        }

        if (safetyEvents.length > 0) {
          lines.push(`SAFETY (${safetyEvents.length})`);
          const counts = {};
          for (const e of safetyEvents) {
            const key = e.label.split(' — ')[0].replace(/\(.*\)/, '').trim();
            counts[key] = (counts[key] || 0) + 1;
          }
          for (const [label, count] of Object.entries(counts)) lines.push(`  • ${label}: ${count}`);
          lines.push(`  Details: ${APP_BASE_URL}/parent`);
          lines.push('');
        }

        if (goalLines.length > 0) {
          lines.push('SAVINGS GOALS');
          lines.push(...goalLines);
          lines.push('  Matches are paid by you directly — Blockwork never moves that money.');
          lines.push('');
        }

        lines.push(`Open your dashboard: ${APP_BASE_URL}/parent`);
        lines.push(`Turn this weekly email off any time: ${APP_BASE_URL}/account`);

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: parent.email,
          subject: `Your Blockwork week${completedThisWeek.length ? ` — ${money(earnings)} earned` : ''}`,
          body: `${lines.join('\n')}${emailFooter(APP_BASE_URL)}`,
        });
        sent++;
      } catch (err) {
        console.error(`weekly summary failed for ${parent.id}:`, err?.message);
      }
    }

    console.log(`sendWeeklyParentSummary: sent ${sent}, skipped ${skipped}`);
    return Response.json({ ok: true, sent, skipped, parents: parents.length });
  } catch (error) {
    console.error('sendWeeklyParentSummary error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});