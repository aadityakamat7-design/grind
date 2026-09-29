import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  requireAdmin, readReason, writeAdminAudit, notifyUser,
} from '../../shared/adminAction.ts';
import { getVerifiedAge } from '../../shared/teenAge.ts';

// Puts an account on hold, or lifts the hold.
//
// The hold is a safety control, not a punishment: the person can still sign in
// and see their own records, and anything already booked stays booked. What
// they cannot do is start anything new — every action gate reads
// User.account_status (see shared/accountStatus.ts). A teen's profile status is
// mirrored as well, because that is what hides them from neighbor search and
// blocks a booking from the other side.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44, req);
    if (auth.error) return auth.error;
    const { user, ip } = auth;

    const body = await req.json();
    const userId = String(body?.userId || '').trim();
    if (!userId) return Response.json({ error: 'userId required' }, { status: 400 });
    if (userId === user.id) {
      return Response.json({ error: 'You cannot put your own account on hold.' }, { status: 400 });
    }

    const suspend = body?.suspended === true;
    const reason = readReason(body);
    if (reason.error) return Response.json({ error: reason.error }, { status: 400 });

    const svc = base44.asServiceRole.entities;
    const target = await svc.User.get(userId).catch(() => null);
    if (!target) return Response.json({ error: 'Account not found' }, { status: 404 });

    const wasSuspended = target.account_status === 'suspended';
    if (suspend && wasSuspended) {
      return Response.json({ error: 'This account is already on hold.' }, { status: 400 });
    }
    if (!suspend && !wasSuspended) {
      return Response.json({ error: 'This account is not on hold.' }, { status: 400 });
    }

    const reasonText = `${reason.reasonCode}${reason.reasonNote ? ` — ${reason.reasonNote}` : ''}`;
    const teenProfiles = await svc.TeenProfile.filter({ user_id: userId });
    const teen = teenProfiles[0];

    // Lifting a teen's hold restores the state they were actually in: active
    // while a confirmed parent link (or 18+ independence) is in place, and
    // otherwise waiting on a parent again.
    let teenStatus = null;
    if (teen) {
      if (suspend) {
        teenStatus = 'suspended';
      } else {
        const links = await svc.ParentTeenLink.filter({ teen_user_id: userId, status: 'confirmed' });
        const priv = (await svc.TeenPrivateData.filter({ user_id: userId }))[0];
        const age = priv ? getVerifiedAge(priv) : null;
        teenStatus = (links.length > 0 || (age != null && age >= 18)) ? 'active' : 'pending_parent';
      }
    }

    const before = { account_status: target.account_status || 'active', teen_status: teen?.status ?? null };

    await svc.User.update(userId, {
      account_status: suspend ? 'suspended' : 'active',
      account_status_reason: suspend ? reasonText : '',
    });
    if (teen && teenStatus) await svc.TeenProfile.update(teen.id, { status: teenStatus });

    const name = target.full_name || target.email || 'this account';

    await notifyUser(base44, userId, {
      type: 'safety',
      title: suspend ? 'Your account is on hold' : 'Your account is active again',
      body: suspend
        ? 'Blockwork support has paused new jobs, bookings, listings and messages on your account while we review it. Anything already booked is unaffected. Contact support if you think this is a mistake.'
        : 'The hold on your account has been lifted — you can take jobs, hire, post and message again.',
      link: '/support',
    });

    // A parent has to know their teen's account was put on hold, and a parent's
    // hold leaves their teen unable to get bookings approved — both need telling.
    const familyIds = [];
    if (teen) {
      const parentLinks = await svc.ParentTeenLink.filter({ teen_user_id: userId, status: 'confirmed' });
      familyIds.push(...parentLinks.map((l) => l.parent_user_id));
    }
    const teenLinks = await svc.ParentTeenLink.filter({ parent_user_id: userId, status: 'confirmed' });
    familyIds.push(...teenLinks.map((l) => l.teen_user_id));

    for (const familyId of [...new Set(familyIds.filter(Boolean))]) {
      await notifyUser(base44, familyId, {
        type: 'safety',
        title: suspend ? 'A linked account is on hold' : 'A linked account is active again',
        body: suspend
          ? `Blockwork support has paused ${name}'s account while we review it. Your own account is not affected — contact support if you have questions.`
          : `${name}'s account is active again.`,
        link: '/support',
      });
    }

    await writeAdminAudit(base44, {
      admin: user,
      action: suspend ? 'suspend_account' : 'reinstate_account',
      actionGroup: 'account',
      targetType: 'User',
      targetId: userId,
      subjectUserId: userId,
      reasonCode: reason.reasonCode,
      reasonNote: reason.reasonNote,
      before,
      after: { account_status: suspend ? 'suspended' : 'active', teen_status: teenStatus ?? before.teen_status },
      summary: suspend
        ? `Put ${name} on hold — new jobs, bookings, listings and messages are paused for this account.`
        : `Lifted the hold on ${name}.`,
      ip,
    });

    return Response.json({
      success: true,
      account_status: suspend ? 'suspended' : 'active',
      teen_status: teenStatus,
    });
  } catch (error) {
    console.error('adminSetAccountSuspension error:', error.message);
    return Response.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
});