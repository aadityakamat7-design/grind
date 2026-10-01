import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { cleanDest } from '../../shared/entryIntent.ts';

// Moves an account forward one sign-up step, in order, on the server:
//   profile_complete → parent_link_shown → done
// (account_created → profile_complete happens only inside saveSignupRole.)
// Only teens and parents have the parent-link step. The dashboard is reached
// only when the step is `done`, which also sets `onboarded`.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { to } = await req.json().catch(() => ({}));
    const step = user.onboarding_step;

    // Accounts from before onboarding_step existed are already finished.
    if (!step && user.onboarded) return Response.json({ ok: true, step: 'done' });

    const role = String(user.app_role || '').toLowerCase();
    if (!role || (role !== 'teen' && role !== 'parent')) {
      return Response.json({ error: 'Finish your profile first.' }, { status: 403 });
    }

    const svc = base44.asServiceRole.entities;

    if (to === 'parent_link_shown') {
      if (step !== 'profile_complete' && step !== 'parent_link_shown') {
        return Response.json({ error: 'Finish your profile first.' }, { status: 403 });
      }
      if (step !== 'parent_link_shown') await svc.User.update(user.id, { onboarding_step: 'parent_link_shown' });
      return Response.json({ ok: true, step: 'parent_link_shown' });
    }

    if (to === 'done') {
      // Where the person was heading before they signed up (an approval link, for
      // example) — handed back once, then cleared.
      const dest = cleanDest(user.saved_destination);
      if (step === 'done') return Response.json({ ok: true, step: 'done', dest });
      if (step !== 'parent_link_shown') {
        return Response.json({ error: 'Finish the previous step first.' }, { status: 403 });
      }
      await svc.User.update(user.id, {
        onboarding_step: 'done',
        onboarded: true,
        saved_destination: '',
        pending_invite_code: '',
      });
      return Response.json({ ok: true, step: 'done', dest });
    }

    return Response.json({ error: 'Unknown step.' }, { status: 400 });
  } catch (error: any) {
    console.error('advanceOnboarding failed:', error?.message || error);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
});