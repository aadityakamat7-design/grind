import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const MAX_UNIT_PRICE = 500;
const MIN_TITLE = 3;
const MAX_TITLE = 120;
const MAX_DESC = 2000;

// Server-side job post creation with title + price validation.
// RLS locks JobPost.create to admin-only, so this function is the only path.
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

    const job = await base44.asServiceRole.entities.JobPost.create({
      buyer_user_id: user.id,
      buyer_name: body.buyerName || 'Neighbor',
      title,
      description: (body.description || '').trim().slice(0, MAX_DESC),
      category: body.category,
      price,
      price_model: body.price_model || 'FIXED',
      zip: body.zip || '',
      state: body.state,
      is_physical: body.is_physical !== false,
      address: body.is_physical !== false ? (body.address || '').trim() : '',
      scheduled_start: body.scheduledStart || undefined,
      ai_approved: body.ai_approved !== false,
      ai_minimum_age: body.ai_minimum_age || 13,
      ai_law_notes: body.ai_law_notes || '',
    });

    return Response.json({ job });
  } catch (error) {
    console.error('createJobPost error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});