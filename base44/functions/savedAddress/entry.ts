import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { geocodeAddress } from '../../shared/geocode.ts';
import { validateZip, validateLabel, validateJobNotes } from '../../shared/accountValidation.ts';
import { writeAuditLog } from '../../shared/auditLog.ts';
import { getClientIp } from '../../shared/rateLimiter.ts';

// A neighbor's saved addresses: add, edit, remove, and pick the default.
// Every address is verified against California on the server — both that the
// ZIP looks right AND that the place actually exists — and an address that an
// upcoming booking is using can't be removed until that job is finished.

const ACTIVE_STATUSES = ['payment_pending', 'pending_parent_approval', 'confirmed', 'in_progress'];
const MAX_ADDRESSES = 10;

/** Loose comparison so "123 Main St" and "123 Main Street, 94539" match. */
function sameAddress(a?: string, b?: string) {
  const flat = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const x = flat(a);
  const y = flat(b);
  if (!x || !y) return false;
  return x === y || x.startsWith(y) || y.startsWith(x);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, id, label, address, zip, job_notes, is_default } = await req.json().catch(() => ({}));
    const svc = base44.asServiceRole.entities;
    const role = String(user.app_role || '').toLowerCase();
    const ip = getClientIp(req);

    if (!['buyer', 'parent', 'admin'].includes(role) && !user.has_buyer_profile) {
      return Response.json({ error: 'Only neighbors can save addresses.' }, { status: 403 });
    }

    const mine = await svc.SavedAddress.filter({ user_id: user.id });

    if (action === 'delete') {
      const row = mine.find((a: any) => a.id === id);
      if (!row) return Response.json({ error: 'That address isn\'t on your account.' }, { status: 404 });

      // An upcoming booking keeps the address it was booked at. Make the person
      // finish or change that job first, and tell them exactly which job.
      const upcoming = await svc.Booking.filter({
        buyer_user_id: user.id,
        status: { $in: ACTIVE_STATUSES },
        scheduled_start: { $gte: new Date().toISOString() },
      }, '-scheduled_start', 25);
      const blocking = upcoming.find((b: any) => sameAddress(b.address, row.address));
      if (blocking) {
        const when = blocking.scheduled_start ? new Date(blocking.scheduled_start).toLocaleDateString() : 'soon';
        return Response.json({
          error: `This address is used by an upcoming booking ("${blocking.listing_title}" on ${when}). Use "Change job address" on that booking first.`,
          code: 'address_in_use',
          booking_id: blocking.id,
          booking_title: blocking.listing_title,
        }, { status: 409 });
      }

      await svc.SavedAddress.delete(row.id);
      if (row.is_default) {
        const rest = mine.filter((a: any) => a.id !== row.id);
        if (rest[0]) await svc.SavedAddress.update(rest[0].id, { is_default: true });
      }
      await writeAuditLog(base44, {
        actor_user_id: user.id, actor_role: role, action: 'account_address_removed', category: 'security',
        target_type: 'SavedAddress', target_id: row.id,
        summary: `Removed saved address "${row.label || 'Home'}"`, metadata: { address: row.address }, ip,
      });
      return Response.json({ ok: true });
    }

    if (action === 'set_default') {
      const row = mine.find((a: any) => a.id === id);
      if (!row) return Response.json({ error: 'That address isn\'t on your account.' }, { status: 404 });
      for (const other of mine) {
        if (other.id !== row.id && other.is_default) await svc.SavedAddress.update(other.id, { is_default: false });
      }
      await svc.SavedAddress.update(row.id, { is_default: true });
      return Response.json({ ok: true });
    }

    if (action !== 'save') return Response.json({ error: 'Unknown action.' }, { status: 400 });

    // ---- Save (create or edit) ----
    const cleanLabel = validateLabel(label);
    if (!cleanLabel.ok) return Response.json({ error: cleanLabel.error }, { status: 400 });
    const cleanNotes = validateJobNotes(job_notes);
    if (!cleanNotes.ok) return Response.json({ error: cleanNotes.error }, { status: 400 });
    const cleanZip = validateZip(zip);
    if (!cleanZip.ok) return Response.json({ error: cleanZip.error }, { status: 400 });

    const street = String(address || '').trim();
    if (street.length < 5 || street.length > 200) {
      return Response.json({ error: 'Enter the street address.' }, { status: 400 });
    }

    const existing = id ? mine.find((a: any) => a.id === id) : null;
    if (id && !existing) return Response.json({ error: 'That address isn\'t on your account.' }, { status: 404 });
    if (!existing && mine.length >= MAX_ADDRESSES) {
      return Response.json({ error: `You can save up to ${MAX_ADDRESSES} addresses.` }, { status: 400 });
    }

    // Verified on the server: the place has to be real and in California.
    let geo;
    try {
      geo = await geocodeAddress(`${street}, ${cleanZip.value}, CA`);
    } catch (err: any) {
      return Response.json({ error: err?.message || 'We couldn\'t verify that address. Please check it and try again.' }, { status: 400 });
    }
    if (String(geo.state || '').toUpperCase() !== 'CA') {
      return Response.json({
        error: `Blockwork only works in California right now — that address is in ${geo.state || 'another state'}.`,
      }, { status: 403 });
    }

    const wantsDefault = is_default === true || (!mine.length && is_default !== false);
    if (wantsDefault) {
      for (const other of mine) {
        if (other.is_default && other.id !== existing?.id) await svc.SavedAddress.update(other.id, { is_default: false });
      }
    }

    const patch = {
      user_id: user.id,
      label: cleanLabel.value,
      address: street,
      zip: cleanZip.value,
      city: geo.city || '',
      state: geo.state || 'CA',
      latitude: geo.lat,
      longitude: geo.lng,
      job_notes: cleanNotes.value,
      is_default: wantsDefault || (existing ? !!existing.is_default && is_default !== false : false),
    };

    const saved = existing
      ? await svc.SavedAddress.update(existing.id, patch)
      : await svc.SavedAddress.create(patch);

    // The neighbor's own profile address follows the default address, so
    // distance matching and the booking flow keep working from one place.
    if (patch.is_default && (role === 'buyer' || user.has_buyer_profile)) {
      const profiles = await svc.BuyerProfile.filter({ user_id: user.id });
      if (profiles[0]) {
        await svc.BuyerProfile.update(profiles[0].id, {
          address: street,
          zip: cleanZip.value,
          city: geo.city || '',
          state: geo.state || 'CA',
          latitude: geo.lat,
          longitude: geo.lng,
        });
      }
    }

    await writeAuditLog(base44, {
      actor_user_id: user.id, actor_role: role,
      action: existing ? 'account_address_changed' : 'account_address_added',
      category: 'security', target_type: 'SavedAddress', target_id: saved?.id || '',
      summary: `${existing ? 'Changed' : 'Added'} saved address "${cleanLabel.value}"`,
      metadata: { before: existing?.address || '', after: street, zip: cleanZip.value, city: geo.city, state: geo.state },
      ip,
    });

    return Response.json({ ok: true, address: { id: saved?.id, label: cleanLabel.value, address: street, zip: cleanZip.value, city: geo.city, state: geo.state, job_notes: cleanNotes.value, is_default: patch.is_default } });
  } catch (error: any) {
    console.error('savedAddress error:', error?.message || error);
    return Response.json({ error: 'Could not save that address. Please try again.' }, { status: 500 });
  }
});