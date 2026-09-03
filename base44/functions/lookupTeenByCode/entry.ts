import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { CATEGORY_AGES, JOB_CATEGORIES, CONSERVATIVE_DEFAULT_AGE } from '../../shared/categoryAgeRules.ts';
import { getWorkHourRules } from '../../shared/workHourRules.ts';
import { getVerifiedAge } from '../../shared/teenAge.ts';
import { checkRateLimit, recordFailedAttempt, recordSuccess, isCodeLocked, recordCodeFailure, getClientIp } from '../../shared/rateLimiter.ts';
import { alertSecurityEvent } from '../../shared/securityMonitor.ts';

// Looks up a teen by their invite code so a parent can review the teen's
// info and the specific state child-labor rules BEFORE consenting. Returns
// stateRules ({ state, age, categoryMinAges, hourRules }) that the parent
// onboarding UI renders in StateRulesDisplay. Does NOT create a link — that
// happens in confirmParentLink after explicit consent.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    let code = (String(body.code || '')).trim().toUpperCase();
    if (!code) {
      const url = new URL(req.url);
      code = (url.searchParams.get('code') || '').trim().toUpperCase();
    }
    if (!code) {
      return Response.json({ error: 'A connection code is required.' }, { status: 400 });
    }

    // Rate limit: max 5 lookups per 10 minutes per IP and per user. This
    // prevents brute-forcing invite codes to enumerate teen identities. The
    // invite code is also locked after 10 failed lookups (same threshold as
    // confirmParentLink) so a brute-force attack locks the code before it
    // can succeed.
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(ip, user.id);
    if (!rateCheck.allowed) {
      return Response.json({ error: 'Too many attempts. Please wait a few minutes before trying again.' }, { status: 429 });
    }
    if (isCodeLocked(code)) {
      await alertSecurityEvent(base44, {
        type: 'safety',
        title: 'Locked invite code attempted',
        body: `Someone tried to look up locked invite code "${code}" from IP ${ip}.`,
      });
      return Response.json({ error: 'This invite code has been locked due to too many failed attempts. Please contact support.' }, { status: 429 });
    }

    const svc = base44.asServiceRole.entities;
    const teens = await svc.TeenProfile.filter({ invite_code: code });
    const teen = teens[0];
    if (!teen) {
      recordFailedAttempt(ip, user.id);
      const codeResult = recordCodeFailure(code);
      if (codeResult.locked) {
        await alertSecurityEvent(base44, {
          type: 'safety',
          title: 'Invite code locked after repeated failed lookups',
          body: `Invite code "${code}" has been locked after ${codeResult.failCount} failed lookup attempts from IP ${ip}.`,
        });
      }
      return Response.json({ error: 'No teen found with that code — double-check and try again.' }, { status: 404 });
    }
    recordSuccess(ip, user.id);
    if (teen.user_id === user.id) {
      return Response.json({ error: 'You cannot link to your own account.' }, { status: 400 });
    }
    // CA-only: the teen must be in California
    if ((teen.state || '').toUpperCase() !== 'CA') {
      return Response.json({ error: 'Blockwork is currently only available in California.' }, { status: 403 });
    }

    const privateRecords = await svc.TeenPrivateData.filter({ user_id: teen.user_id });
    const privateData = privateRecords[0] || null;
    const age = getVerifiedAge(privateData);

    const state = teen.state || '';
    const categoryMinAges: Record<string, number> = {};
    for (const cat of JOB_CATEGORIES) {
      categoryMinAges[cat] = CATEGORY_AGES[state]?.[cat] ?? CONSERVATIVE_DEFAULT_AGE;
    }
    const hourRules = getWorkHourRules(state, age);

    // stateRules is null when the teen hasn't set their state yet — the UI
    // shows an "unavailable" fallback in that case.
    const stateRules = state && hourRules ? { state, age, categoryMinAges, hourRules } : null;

    return Response.json({
      teenName: teen.display_name,
      teenState: state,
      teenAge: age,
      ageVerified: !!privateData?.verified_dob,
      stateRules,
    });
  } catch (error) {
    console.error('lookupTeenByCode error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});