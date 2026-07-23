import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

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
      listing = await svc.Listing.create({
        ...data,
        teen_user_id: body.teenUserId,
        teen_profile_id: body.teenProfileId,
        teen_display_name: (body.teenDisplayName || '').slice(0, 50),
      });
    }

    return Response.json({ listing });
  } catch (error) {
    console.error('saveListing error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});