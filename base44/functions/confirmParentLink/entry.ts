import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { notifyAdmins } from '../../shared/notifyAdmins.ts';
import { CONSENT_ITEMS, CONSENT_VERSION } from '../../shared/consentItems.ts';
import { getVerifiedAge } from '../../shared/teenAge.ts';

// Parent-teen linking — two-factor safety model:
//   Check 1: parent identity verified (Stripe Identity: government ID + liveness)
//   Check 2: relationship attested (invite code + explicit attestation checkbox)
// The link only becomes 'confirmed' and the teen only goes 'active' when BOTH
// checks pass. If identity is not yet verified, the link stays 'pending' and
// the teen remains unlistable/unsearchable. When the parent later completes
// identity verification, markParentVerified (in identityVerification.ts)
// flips the link to confirmed and activates the teen.
//
// Every itemized consent, the state-rules snapshot shown, the parent's IP, and
// the user agent are recorded in a ConsentRecord for a complete audit trail.
//
// Rate limiting: max 5 attempts per 10 minutes per user and per IP, with
// exponential backoff between attempts. Invite codes are locked after 10
// failed attempts, and the teen + any linked parent are notified.

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;
const CODE_LOCK_THRESHOLD = 10;
const CODE_LOCK_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { inviteCode, attestRelationship, consents, stateRulesAcknowledged, stateRules, userAgent } = await req.json();
    if (!inviteCode) return Response.json({ error: 'inviteCode required' }, { status: 400 });
    if (attestRelationship !== true) {
      return Response.json({ error: 'You must explicitly confirm you are this teen\'s parent or legal guardian.' }, { status: 400 });
    }
    // Require the state-rules acknowledgment and every itemized consent before
    // the link is confirmed — no partial consent is accepted.
    if (stateRulesAcknowledged !== true) {
      return Response.json({ error: 'Please acknowledge the state child-labor rules before linking.' }, { status: 400 });
    }
    if (!consents || typeof consents !== 'object') {
      return Response.json({ error: 'All consent items are required.' }, { status: 400 });
    }
    for (const item of CONSENT_ITEMS) {
      if (consents[item.key] !== true) {
        return Response.json({ error: 'All consent items are required before linking.' }, { status: 400 });
      }
    }

    const svc = base44.asServiceRole.entities;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip') || 'unknown';
    const code = String(inviteCode).trim().toUpperCase();
    const now = Date.now();

    // --- Rate limiting: fetch recent attempts ---
    const [userAttempts, ipAttempts, codeAttempts] = await Promise.all([
      svc.LinkAttempt.filter({ user_id: user.id }, '-created_date', 50),
      svc.LinkAttempt.filter({ ip }, '-created_date', 50),
      svc.LinkAttempt.filter({ code, success: false }, '-created_date', 50),
    ]);

    const recentUserAttempts = userAttempts.filter(a => a.created_date && new Date(a.created_date).getTime() > now - WINDOW_MS);
    const recentIpAttempts = ipAttempts.filter(a => a.created_date && new Date(a.created_date).getTime() > now - WINDOW_MS);
    const recentCodeFailures = codeAttempts.filter(a => a.created_date && new Date(a.created_date).getTime() > now - CODE_LOCK_WINDOW_MS);

    // Exponential backoff: enforce a minimum delay between attempts that
    // doubles with each attempt, so a bot can't fire 5 attempts in 1 second.
    if (recentUserAttempts.length > 0) {
      const lastAttempt = recentUserAttempts[0];
      const elapsed = now - new Date(lastAttempt.created_date).getTime();
      const requiredDelay = Math.min(Math.pow(2, recentUserAttempts.length) * 1000, 300000);
      if (elapsed < requiredDelay) {
        return Response.json({ error: 'Too many attempts. Please wait a moment before trying again.' }, { status: 429 });
      }
    }

    // Hard rate limit: max 5 attempts per 10 minutes per user
    if (recentUserAttempts.length >= MAX_ATTEMPTS) {
      return Response.json({ error: 'Too many attempts. Please wait a few minutes before trying again.' }, { status: 429 });
    }

    // Hard rate limit: max 5 attempts per 10 minutes per IP
    if (recentIpAttempts.length >= MAX_ATTEMPTS) {
      return Response.json({ error: 'Too many attempts from your network. Please try again later.' }, { status: 429 });
    }

    // Code lock: after 10 failed attempts against this code, lock it
    if (recentCodeFailures.length >= CODE_LOCK_THRESHOLD) {
      return Response.json({ error: 'This invite code has been locked due to too many failed attempts. Please contact support.' }, { status: 429 });
    }

    // --- Lookup the teen ---
    const teens = await svc.TeenProfile.filter({ invite_code: code });
    const teen = teens[0];

    // Record every attempt (success or failure) for admin audit
    const isSuccess = !!teen && teen.user_id !== user.id;
    await svc.LinkAttempt.create({
      user_id: user.id,
      ip,
      code,
      teen_user_id: teen?.user_id || '',
      success: isSuccess,
    });

    if (!teen) {
      return Response.json({ error: 'No teen found with that code — double-check and try again.' }, { status: 404 });
    }
    if (teen.user_id === user.id) {
      return Response.json({ error: 'You cannot link to your own account.' }, { status: 400 });
    }

    // --- Check if this code just hit the lock threshold ---
    if (recentCodeFailures.length + 1 >= CODE_LOCK_THRESHOLD) {
      await svc.Notification.create({
        user_id: teen.user_id,
        type: 'safety',
        title: 'Security alert: repeated failed link attempts',
        body: `Someone tried to link to your account ${CODE_LOCK_THRESHOLD} times with incorrect codes. Your invite code has been locked for safety. Contact support if you need a new code.`,
        link: '/account',
        read: false,
      });
      const existingLinks = await svc.ParentTeenLink.filter({ teen_user_id: teen.user_id, status: 'confirmed' });
      if (existingLinks[0]?.parent_user_id) {
        await svc.Notification.create({
          user_id: existingLinks[0].parent_user_id,
          type: 'safety',
          title: 'Security alert: failed link attempts to your teen',
          body: `Someone tried to link to ${teen.display_name}'s account ${CODE_LOCK_THRESHOLD} times with incorrect codes. The invite code has been locked.`,
          link: '/parent',
          read: false,
        });
      }
      await notifyAdmins(base44, {
        type: 'safety',
        title: 'Invite code locked after repeated failures',
        body: `Invite code "${code}" (teen: ${teen.display_name}) has been locked after ${CODE_LOCK_THRESHOLD} failed attempts.`,
        link: '/admin',
      });
      return Response.json({ error: 'This invite code has been locked due to too many failed attempts. Please contact support.' }, { status: 429 });
    }

    // --- Proceed with the link ---
    const parentProfiles = await svc.ParentProfile.filter({ user_id: user.id });
    const identityVerified = !!parentProfiles[0]?.is_identity_verified;

    const nowIso = new Date().toISOString();
    const fullyVerified = identityVerified;

    const data = {
      teen_profile_id: teen.id,
      teen_display_name: teen.display_name,
      identity_verified: identityVerified,
      relationship_confirmed: true,
      relationship_attested_at: nowIso,
      ...(fullyVerified ? { status: 'confirmed', confirmed_at: nowIso } : { status: 'pending' }),
    };

    const existing = await svc.ParentTeenLink.filter({ parent_user_id: user.id, teen_user_id: teen.user_id });
    let linkId;
    if (existing[0]) {
      await svc.ParentTeenLink.update(existing[0].id, data);
      linkId = existing[0].id;
    } else {
      const created = await svc.ParentTeenLink.create({ parent_user_id: user.id, teen_user_id: teen.user_id, ...data });
      linkId = created.id;
    }

    await svc.TeenProfile.update(teen.id, {
      parent_identity_verified: identityVerified,
      ...(fullyVerified ? { status: 'active' } : {}),
    });

    const privateRecords = await svc.TeenPrivateData.filter({ user_id: teen.user_id });
    if (privateRecords[0]) {
      await svc.TeenPrivateData.update(privateRecords[0].id, { parent_user_id: user.id });
    }

    // --- Record the full itemized consent for audit ---
    const teenVerifiedAge = getVerifiedAge(privateRecords[0]);
    const consentRecords = CONSENT_ITEMS.map((item) => ({
      key: item.key,
      label: item.label,
      accepted: consents[item.key] === true,
      accepted_at: nowIso,
    }));
    await svc.ConsentRecord.create({
      parent_user_id: user.id,
      teen_user_id: teen.user_id,
      parent_teen_link_id: linkId,
      consent_version: CONSENT_VERSION,
      consents: consentRecords,
      state_rules_shown: stateRules ? JSON.stringify(stateRules) : '',
      state_rules_acknowledged: true,
      teen_state: teen.state || '',
      teen_verified_age: teenVerifiedAge,
      ip,
      user_agent: userAgent || '',
      status: 'active',
    });

    if (fullyVerified) {
      await svc.Notification.create({
        user_id: teen.user_id,
        type: 'approval',
        title: 'Your account is live! 🎉',
        body: `${user.full_name || 'Your parent'} confirmed your link and verified their ID. You can now publish services and take jobs.`,
        link: '/teen',
      });
      await svc.Notification.create({
        user_id: user.id,
        type: 'approval',
        title: `You're linked with ${teen.display_name}! 🎉`,
        body: `You'll now see their bookings, income, and safety status on your dashboard.`,
        link: '/parent',
      });
    } else {
      await svc.Notification.create({
        user_id: teen.user_id,
        type: 'approval',
        title: 'Parent linked — one more step',
        body: `${user.full_name || 'Your parent'} confirmed the link. They still need to verify their ID before your account goes live.`,
        link: '/teen',
      });
      await svc.Notification.create({
        user_id: user.id,
        type: 'approval',
        title: 'Link started — verify your ID',
        body: `You're linked with ${teen.display_name}. Verify your government ID to activate their account.`,
        link: '/parent',
      });
    }

    return Response.json({ linked: true, fullyVerified, teenName: teen.display_name });
  } catch (error) {
    console.error('confirmParentLink error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});