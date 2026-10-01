import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { emailFooter } from '../../shared/emailFooter.ts';
import { APP_BASE_URL } from '../../shared/safeOrigin.ts';

// Savings goals with a parent match pledge.
//
// IMPORTANT: the match is TRACKING ONLY. No money moves through Blockwork for
// it — the parent pays it themselves, and the UI says so. Progress is the
// teen's net earnings since the goal was created.
//
//   create    — the teen creates a goal (name + amount)
//   update    — the teen renames or changes the amount
//   pledge    — the parent sets the match percentage (0–100) for a linked teen
//   celebrate — the teen has seen the goal-reached celebration
//   archive   — either side closes the goal
//
// Progress is computed server-side from EarningsRecord, so the bar can't be
// inflated by the client.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, goalId, name, targetAmount, matchPercent, teenUserId } = await req.json();
    const svc = base44.asServiceRole.entities;

    const isAdmin = String(user.role || '').toLowerCase() === 'admin' || user.app_role === 'admin';

    // Net earnings since a goal started — the teen's own paid-out work.
    const savedSince = async (teen, since) => {
      const rows = await svc.EarningsRecord.filter({ teen_user_id: teen }, '-occurred_at', 500);
      const from = since ? new Date(since).getTime() : 0;
      return Math.round(
        rows
          .filter((r) => !r.occurred_at || new Date(r.occurred_at).getTime() >= from)
          .reduce((s, r) => s + (Number(r.net_amount) || 0), 0) * 100,
      ) / 100;
    };

    if (action === 'create') {
      if (user.app_role !== 'teen') {
        return Response.json({ error: 'Only teens can create a savings goal.' }, { status: 403 });
      }
      const cleanName = String(name || '').trim().slice(0, 60);
      const amount = Number(targetAmount);
      if (cleanName.length < 1) return Response.json({ error: 'Give your goal a name.' }, { status: 400 });
      if (!Number.isFinite(amount) || amount < 1 || amount > 5000) {
        return Response.json({ error: 'Choose a goal between $1 and $5,000.' }, { status: 400 });
      }
      const links = await svc.ParentTeenLink.filter({ teen_user_id: user.id, status: 'confirmed' });
      const goal = await svc.SavingsGoal.create({
        teen_user_id: user.id,
        parent_user_id: links[0]?.parent_user_id || '',
        name: cleanName,
        target_amount: amount,
        match_percent: 0,
        status: 'active',
      });
      return Response.json({ goal, saved: await savedSince(user.id, goal.created_date) });
    }

    if (!goalId) return Response.json({ error: 'goalId required' }, { status: 400 });

    let goal;
    try {
      goal = await svc.SavingsGoal.get(goalId);
    } catch {
      goal = null;
    }
    if (!goal) return Response.json({ error: 'Goal not found' }, { status: 404 });

    const links = await svc.ParentTeenLink.filter({ teen_user_id: goal.teen_user_id, status: 'confirmed' });
    const parentId = goal.parent_user_id || links[0]?.parent_user_id || '';
    const isOwnTeen = user.id === goal.teen_user_id;
    const isLinkedParent = !!parentId && user.id === parentId;
    if (!isOwnTeen && !isLinkedParent && !isAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'pledge') {
      if (!isLinkedParent && !isAdmin) {
        return Response.json({ error: 'Only your parent can set a match pledge.' }, { status: 403 });
      }
      const pct = Number(matchPercent);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        return Response.json({ error: 'The match must be between 0% and 100%.' }, { status: 400 });
      }
      await svc.SavingsGoal.update(goal.id, { match_percent: pct });
      if (isOwnTeen) return Response.json({ ok: true });
      await svc.Notification.create({
        user_id: goal.teen_user_id,
        type: 'savings',
        title: pct > 0 ? `Your parent will match ${pct}%` : 'Match pledge removed',
        body: pct > 0
          ? `Your parent pledged to add ${pct}% of what you save toward "${goal.name}". Matches are paid by your parent directly.`
          : `The match pledge on "${goal.name}" was removed.`,
        link: '/teen/wallet',
        read: false,
      });
      return Response.json({ ok: true, match_percent: pct });
    }

    if (action === 'update') {
      if (!isOwnTeen && !isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const update: Record<string, unknown> = {};
      if (name != null) {
        const cleanName = String(name).trim().slice(0, 60);
        if (!cleanName) return Response.json({ error: 'Give your goal a name.' }, { status: 400 });
        update.name = cleanName;
      }
      if (targetAmount != null) {
        const amount = Number(targetAmount);
        if (!Number.isFinite(amount) || amount < 1 || amount > 5000) {
          return Response.json({ error: 'Choose a goal between $1 and $5,000.' }, { status: 400 });
        }
        update.target_amount = amount;
      }
      await svc.SavingsGoal.update(goal.id, update);
    }

    if (action === 'archive') {
      if (!isOwnTeen && !isLinkedParent && !isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });
      await svc.SavingsGoal.update(goal.id, { status: 'archived' });
      return Response.json({ ok: true });
    }

    // ── Progress + achievement (also runs for 'update' and plain reads) ──
    const saved = await savedSince(goal.teen_user_id, goal.created_date);
    const target = Number(goal.target_amount) || 0;
    const reached = target > 0 && saved >= target;

    if (reached && goal.status !== 'achieved') {
      await svc.SavingsGoal.update(goal.id, {
        status: 'achieved',
        achieved_at: new Date().toISOString(),
      });
      if (parentId) {
        await svc.Notification.create({
          user_id: parentId,
          type: 'savings',
          title: 'Savings goal reached!',
          body: `Your teen reached their "${goal.name}" goal at $${target.toFixed(2)}. Their earnings are in their Blockwork Wallet.`,
          link: '/parent',
          read: false,
        });
        try {
          const parents = await svc.User.filter({ id: parentId });
          if (parents[0]?.email) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: parents[0].email,
              subject: `Goal reached — "${goal.name}"`,
              body:
                `Hi,\n\nYour teen hit their savings goal "${goal.name}" — $${target.toFixed(2)} saved from real work on Blockwork.\n\n` +
                `Savings goals track earnings. If you pledged a match, remember it's paid by you directly — ` +
                `Blockwork never moves that money.\n\n` +
                `See their progress: ${APP_BASE_URL}/parent${emailFooter(APP_BASE_URL)}`,
            });
          }
        } catch (err) {
          console.error('goal reached email failed:', err?.message);
        }
      }
    }

    if (action === 'celebrate' && isOwnTeen) {
      await svc.SavingsGoal.update(goal.id, { celebrated_at: new Date().toISOString() });
    }

    const matchAmount = Math.round(((Number(goal.match_percent) || 0) / 100) * saved * 100) / 100;
    return Response.json({
      ok: true,
      goal: {
        ...goal,
        status: reached ? 'achieved' : goal.status,
        match_percent: Number(goal.match_percent) || 0,
      },
      saved,
      match_amount: matchAmount,
      reached,
      just_reached: reached && goal.status !== 'achieved',
    });
  } catch (error) {
    console.error('manageSavingsGoal error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});