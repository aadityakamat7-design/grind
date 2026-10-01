import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { validateFullName, validatePhone, validateBio, validateZip, deriveDisplayName, BIO_MAX } from '../../shared/accountValidation.ts';
import { geocodeAddress } from '../../shared/geocode.ts';
import { normalizeNotifications, loadAccountSettings } from '../../shared/accountPrefs.ts';
import { writeAuditLog } from '../../shared/auditLog.ts';
import { getClientIp } from '../../shared/rateLimiter.ts';
import { getSafeOrigin } from '../../shared/safeOrigin.ts';
import { createAccountAlert, sendChangeNotice } from '../../shared/accountEmails.ts';
import { fetchStripeAccountName } from '../../shared/stripeAccount.ts';

// Saves the parts of an account a person owns: name, phone, photo, public bio,
// availability, travel distance and notification switches.
// Every value is validated here — the browser is never trusted.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const svc = base44.asServiceRole.entities;
    const role = String(user.app_role || '').toLowerCase();
    const ip = getClientIp(req);
    const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);

    // ---- Name ----
    let newName: string | null = null;
    if (has('full_name')) {
      const check = validateFullName(body.full_name, user.email);
      if (!check.ok) return Response.json({ error: check.error }, { status: 400 });
      if (check.value !== (user.full_name || '')) newName = check.value;
    }

    // A parent's or teen's legal name is the name their payouts are verified
    // under. If a payout account exists, they have to consciously confirm the
    // name still matches before we save it.
    let payoutStripeName: string | null = null;
    if (newName && (role === 'parent' || role === 'teen')) {
      const holder = role === 'parent'
        ? (await svc.ParentProfile.filter({ user_id: user.id }))[0]
        : (await svc.TeenProfile.filter({ user_id: user.id }))[0];
      const accountId = holder?.stripe_connect_account_id;
      if (accountId && holder?.connect_status && holder.connect_status !== 'not_setup') {
        payoutStripeName = await fetchStripeAccountName(accountId);
        if (body.confirm_payout_name_match !== true) {
          return Response.json({
            error: 'Your legal name must match your payout account.',
            code: 'payout_name_match',
            stripe_name: payoutStripeName || '',
          }, { status: 409 });
        }
      }
    }

    // ---- Phone ----
    let phone: string | null = null;
    if (has('phone')) {
      const check = validatePhone(body.phone);
      if (!check.ok) return Response.json({ error: check.error }, { status: 400 });
      phone = check.value;
    }

    // ---- Public bio (teens and independents) ----
    let bio: string | null = null;
    if (has('bio')) {
      const check = validateBio(body.bio, BIO_MAX);
      if (!check.ok) return Response.json({ error: check.error }, { status: 400 });
      bio = check.value;
    }

    let radius: number | null = null;
    if (has('service_radius_miles')) {
      const n = Number(body.service_radius_miles);
      if (!Number.isFinite(n) || n < 1 || n > 25) {
        return Response.json({ error: 'Travel distance must be between 1 and 25 miles.' }, { status: 400 });
      }
      radius = Math.round(n);
    }

    const notices: string[] = [];
    const settings = await loadAccountSettings(svc, user.id);

    // ---- Notification preferences ----
    if (has('notifications')) {
      const prefs = normalizeNotifications(body.notifications);
      if (settings) {
        await svc.AccountSettings.update(settings.id, { notifications: prefs });
      } else {
        await svc.AccountSettings.create({ user_id: user.id, notifications: prefs });
      }
      // Keep the fields the existing senders already read in step.
      await svc.User.update(user.id, {
        parent_weekly_summary: prefs.weekly_summary.email,
        marketing_emails_unsubscribed: !prefs.marketing.email,
      });
    }

    if (phone !== null) {
      await svc.User.update(user.id, { recovery_phone: phone });
      if (settings) await svc.AccountSettings.update(settings.id, { phone });
      else await svc.AccountSettings.create({ user_id: user.id, phone });
    }

    // The account photo. For a teen it is also the public profile photo, which
    // is mirrored onto TeenProfile below and notified to their parent.
    if (has('photo_url')) {
      const photo = String(body.photo_url || '').slice(0, 500);
      if (settings) await svc.AccountSettings.update(settings.id, { photo_url: photo });
      else await svc.AccountSettings.create({ user_id: user.id, photo_url: photo });
    }

    if (newName) {
      await svc.User.update(user.id, { full_name: newName });
      if (payoutStripeName) {
        if (settings) await svc.AccountSettings.update(settings.id, { payout_name_confirmed_at: new Date().toISOString() });
      }
      await writeAuditLog(base44, {
        actor_user_id: user.id,
        actor_role: role,
        action: 'account_name_changed',
        category: 'security',
        target_type: 'User',
        target_id: user.id,
        summary: `Legal name changed to "${newName}"`,
        metadata: { before: user.full_name || '', after: newName, payout_name_matched: !!payoutStripeName },
        ip,
      });
      const token = await createAccountAlert(svc, { userId: user.id, changeType: 'name', detail: `your legal name is now ${newName}` });
      await sendChangeNotice(base44, {
        to: user.contact_email || user.email,
        name: newName,
        what: 'legal name',
        detail: `your legal name is now ${newName}`,
        token,
        origin: getSafeOrigin(req),
      });
      notices.push('Name updated.');
    }

    // ---- Role-specific profile rows ----
    if (role === 'teen') {
      const [profiles, privates] = await Promise.all([
        svc.TeenProfile.filter({ user_id: user.id }),
        svc.TeenPrivateData.filter({ user_id: user.id }),
      ]);
      const profile = profiles[0];
      if (profile) {
        const patch: Record<string, unknown> = {};
        if (bio !== null) patch.bio = bio;
        if (has('photo_url')) patch.photo_url = String(body.photo_url || '').slice(0, 500);
        if (has('is_available')) patch.is_available = body.is_available !== false;
        if (Array.isArray(body.skills)) patch.skills = body.skills.slice(0, 20).map((s: unknown) => String(s).slice(0, 40));
        if (radius !== null) patch.service_radius_miles = radius;
        if (newName) patch.display_name = deriveDisplayName(newName);
        if (Object.keys(patch).length) await svc.TeenProfile.update(profile.id, patch);
      }
      if (newName && privates[0]) {
        await svc.TeenPrivateData.update(privates[0].id, { legal_name: newName });
      }

      // Home ZIP code: checked on the server against California and re-geocoded,
      // because it decides which jobs count as nearby. A teen under 18 has their
      // parent told, since it changes where they can work.
      if (has('home_zip')) {
        const zipCheck = validateZip(body.home_zip);
        if (!zipCheck.ok) return Response.json({ error: zipCheck.error }, { status: 400 });
        let geo;
        try {
          geo = await geocodeAddress(`${zipCheck.value}, CA`);
        } catch (err: any) {
          return Response.json({ error: err?.message || 'We couldn\'t verify that ZIP code. Please check it and try again.' }, { status: 400 });
        }
        if (String(geo.state || '').toUpperCase() !== 'CA') {
          return Response.json({
            error: `Blockwork only works in California right now — that ZIP code is in ${geo.state || 'another state'}.`,
          }, { status: 403 });
        }
        if (privates[0]) {
          await svc.TeenPrivateData.update(privates[0].id, {
            zip: zipCheck.value,
            latitude: geo.lat,
            longitude: geo.lng,
          });
        }
        if (profile) {
          await svc.TeenProfile.update(profile.id, { resolved_city: geo.city || '', state: geo.state || 'CA' });
        }
        await writeAuditLog(base44, {
          actor_user_id: user.id, actor_role: role, action: 'account_zip_changed', category: 'security',
          target_type: 'TeenPrivateData', target_id: privates[0]?.id || '',
          summary: `Home ZIP code changed to ${zipCheck.value}${geo.city ? ` (${geo.city})` : ''}`,
          metadata: { before: privates[0]?.zip || '', after: zipCheck.value, city: geo.city, state: geo.state }, ip,
        });
        const zipToken = await createAccountAlert(svc, {
          userId: user.id,
          changeType: 'address',
          detail: `your home ZIP code is now ${zipCheck.value}${geo.city ? ` (${geo.city})` : ''}`,
        });
        await sendChangeNotice(base44, {
          to: user.contact_email || user.email,
          name: user.full_name,
          what: 'home ZIP code',
          detail: `your home ZIP code is now ${zipCheck.value}${geo.city ? ` (${geo.city})` : ''}`,
          token: zipToken,
          origin: getSafeOrigin(req),
        });
        const zipLinks = await svc.ParentTeenLink.filter({ teen_user_id: user.id, status: 'confirmed' });
        if (zipLinks[0]?.parent_user_id) {
          await svc.Notification.create({
            user_id: zipLinks[0].parent_user_id,
            type: 'account',
            title: `${user.full_name || 'Your teen'} changed their ZIP code`,
            body: `Their home ZIP is now ${zipCheck.value}${geo.city ? ` (${geo.city})` : ''}. Nearby jobs are matched from this.`,
            link: '/parent',
            read: false,
          });
          notices.push('Your parent was told about the new ZIP code.');
        }
      }
    } else if (role === 'parent') {
      const profiles = await svc.ParentProfile.filter({ user_id: user.id });
      const patch: Record<string, unknown> = {};
      if (newName) patch.full_name = newName;
      if (phone !== null) patch.phone = phone;
      if (has('description')) patch.description = String(body.description || '').slice(0, 1000);
      if (profiles[0] && Object.keys(patch).length) await svc.ParentProfile.update(profiles[0].id, patch);
    } else if (role === 'buyer' || user.has_buyer_profile) {
      const profiles = await svc.BuyerProfile.filter({ user_id: user.id });
      const patch: Record<string, unknown> = {};
      if (newName) patch.full_name = newName;
      if (has('description')) patch.description = String(body.description || '').slice(0, 1000);
      if (profiles[0] && Object.keys(patch).length) await svc.BuyerProfile.update(profiles[0].id, patch);
    }

    // ---- A teen's public photo or bio changed: the parent is told, and can
    // take either one down from their own account. ----
    if (role === 'teen' && (bio !== null || has('photo_url'))) {
      const links = await svc.ParentTeenLink.filter({ teen_user_id: user.id, status: 'confirmed' });
      const parentId = links[0]?.parent_user_id;
      if (parentId) {
        const what = bio !== null && has('photo_url') ? 'photo and About me' : has('photo_url') ? 'profile photo' : 'About me';
        await svc.Notification.create({
          user_id: parentId,
          type: 'account',
          title: `${user.full_name || 'Your teen'} updated their ${what}`,
          body: 'You can review it, and remove it if you don\'t want it public.',
          link: `/parent`,
          read: false,
        });
        await writeAuditLog(base44, {
          actor_user_id: user.id,
          actor_role: role,
          action: 'teen_profile_changed',
          category: 'security',
          target_type: 'TeenProfile',
          target_id: user.id,
          summary: `Teen changed ${what}; parent notified`,
          metadata: { bio_changed: bio !== null, photo_changed: has('photo_url') },
          ip,
        });
        notices.push('Your parent was notified about this change.');
      }
    }

    return Response.json({ ok: true, notices });
  } catch (error: any) {
    console.error('accountProfile error:', error?.message || error);
    return Response.json({ error: 'Could not save those details. Please try again.' }, { status: 500 });
  }
});