import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  requireAdmin, readReason, writeAdminAudit, notifyUser,
} from '../../shared/adminAction.ts';
import { getVerifiedAge } from '../../shared/teenAge.ts';

// Mirrors the client's genInviteCode so a code generated here looks and works
// exactly like the one the teen's own profile hands out.
function genInviteCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

// Ends the supervision link between a parent and a teen.
//
// Every check in the app only treats a link as real while its status is
// 'confirmed' — booking approval routing, self-dealing, the payout destination,
// terms acceptance — so taking the link out of that state genuinely removes the
// parent's authority. The parental consent it was based on is revoked with it,
// and the teen goes back to waiting on a parent unless they are 18+ and
// independent. The invite code is replaced so the same link cannot be recreated
// from the code this parent already had.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44, req);
    if (auth.error) return auth.error;
    const { user, ip } = auth;

    const body = await req.json();
    const linkId = String(body?.linkId || '').trim();
    if (!linkId) return Response.json({ error: 'linkId required' }, { status: 400 });

    const reason = readReason(body);
    if (reason.error) return Response.json({ error: reason.error }, { status: 400 });

    const svc = base44.asServiceRole.entities;
    const link = await svc.ParentTeenLink.get(linkId).catch(() => null);
    if (!link) return Response.json({ error: 'Parent link not found' }, { status: 404 });
    if (link.status !== 'confirmed') {
      return Response.json({ error: 'This parent is not currently linked to this teen.' }, { status: 400 });
    }

    const reasonText = `${reason.reasonCode}${reason.reasonNote ? ` — ${reason.reasonNote}` : ''}`;

    // Revoke the parental consent this link was based on — it is the record that
    // a guardian approved the teen working at all.
    const consents = await svc.ConsentRecord.filter({ parent_teen_link_id: linkId, status: 'active' });
    for (const consent of consents) {
      await svc.ConsentRecord.update(consent.id, {
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoked_reason: `Blockwork support unlinked this parent (${reasonText})`,
      });
    }

    const teenProfiles = await svc.TeenProfile.filter({ user_id: link.teen_user_id });
    const teen = teenProfiles[0];

    const before = {
      status: link.status,
      relationship_confirmed: link.relationship_confirmed === true,
      consent_status: consents.length ? 'active' : 'none',
      teen_status: teen?.status ?? null,
    };

    let teenStatus = before.teen_status;
    if (teen) {
      // An 18+ teen keeps working on their own; a minor goes back to waiting for
      // a parent, so no unsupervised booking can be approved for them.
      const priv = (await svc.TeenPrivateData.filter({ user_id: link.teen_user_id }))[0];
      const age = priv ? getVerifiedAge(priv) : null;
      teenStatus = age != null && age >= 18 ? 'active' : 'pending_parent';
      await svc.TeenProfile.update(teen.id, {
        status: teenStatus,
        parent_identity_verified: false,
        invite_code: genInviteCode(),
      });
    }

    await svc.ParentTeenLink.update(linkId, {
      status: 'pending',
      relationship_confirmed: false,
      relationship_attested_at: null,
    });

    const teenName = link.teen_display_name || 'this teen';

    await notifyUser(base44, link.parent_user_id, {
      type: 'safety',
      title: 'Your parent link was removed',
      body: `Blockwork support has ended your link to ${teenName}, so you are no longer listed as their parent on Blockwork. Contact support if you think this is a mistake.`,
      link: '/support',
    });

    await notifyUser(base44, link.teen_user_id, {
      type: 'safety',
      title: 'Your parent link was removed',
      body: 'A parent or guardian link on your account was ended by Blockwork support. Ask your parent or guardian to link again using the new code on your dashboard.',
      link: '/teen',
    });

    await writeAdminAudit(base44, {
      admin: user,
      action: 'unlink_parent_teen',
      actionGroup: 'account',
      targetType: 'ParentTeenLink',
      targetId: linkId,
      subjectUserId: link.teen_user_id,
      reasonCode: reason.reasonCode,
      reasonNote: reason.reasonNote,
      before,
      after: {
        status: 'pending',
        relationship_confirmed: false,
        consent_status: 'revoked',
        teen_status: teenStatus,
      },
      summary: `Ended the parent link between ${teenName} and their parent. Parental consent was revoked, the teen's invite code was replaced, and the teen ${teenStatus === 'active' ? 'keeps working independently' : 'now waits for a parent to link'}.`,
      ip,
    });

    return Response.json({ success: true, teen_status: teenStatus });
  } catch (error) {
    console.error('adminUnlinkParentTeen error:', error.message);
    return Response.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
});