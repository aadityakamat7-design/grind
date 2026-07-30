import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { checkHazard } from '../../shared/hazardCheck.ts';
import { getVerifiedAge } from '../../shared/teenAge.ts';

const MAX_UNIT_PRICE = 500;
const MIN_TITLE = 3;
const MAX_TITLE = 80;
const MAX_DESC = 1000;

// Server-side listing create/update with title + price validation.
// RLS locks Listing.create to admin-only and field-level RLS locks
// title/description/price to admin-only on update, so this function is
// the only path for teens to create or edit their service listings.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const title = (body.title || '').trim();
    if (title.length < MIN_TITLE) {
      return Response.json({ error: `Title must be at least ${MIN_TITLE} characters.` }, { status: 400 });
    }
    if (title.length > MAX_TITLE) {
      return Response.json({ error: `Title must be at most ${MAX_TITLE} characters.` }, { status: 400 });
    }

    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 1 || price > MAX_UNIT_PRICE) {
      return Response.json({ error: `Price must be between $1 and $${MAX_UNIT_PRICE}.` }, { status: 400 });
    }

    const svc = base44.asServiceRole.entities;

    // Server-side hazard screening — a client can't bypass this by calling
    // saveListing directly with a prohibited task.
    const privateData = await svc.TeenPrivateData.filter({ user_id: user.id });
    const age = getVerifiedAge(privateData[0]) ?? 18;
    const hazard = checkHazard(`${title} ${body.description || ''}`, age);
    if (hazard.flagged) {
      return Response.json({ error: hazard.reason }, { status: 400 });
    }

    const data = {
      category: body.category,
      title,
      description: (body.description || '').trim().slice(0, MAX_DESC),
      price_model: body.price_model || 'FIXED',
      price,
      service_area: body.zip || '',
      teen_zip: body.zip || '',
      status: 'published',
    };

    let listing;
    if (body.listingId) {
      const existing = await svc.Listing.get(body.listingId);
      if (!existing || existing.teen_user_id !== user.id) {
        return Response.json({ error: 'Listing not found.' }, { status: 404 });
      }
      await svc.Listing.update(body.listingId, data);
      listing = { id: body.listingId };
    } else {
      // Enforce caller ownership — never trust a client-supplied teenUserId.
      // The listing is always attributed to the authenticated user.
      let teenDisplayName = (user.full_name || '').slice(0, 50);
      if (body.teenProfileId) {
        const profile = await svc.TeenProfile.get(body.teenProfileId);
        if (!profile || profile.user_id !== user.id) {
          return Response.json({ error: 'Invalid teen profile.' }, { status: 403 });
        }
        teenDisplayName = (profile.display_name || teenDisplayName).slice(0, 50);
      }
      listing = await svc.Listing.create({
        ...data,
        teen_user_id: user.id,
        teen_profile_id: body.teenProfileId,
        teen_display_name: teenDisplayName,
      });
    }

    return Response.json({ listing });
  } catch (error) {
    console.error('saveListing error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});