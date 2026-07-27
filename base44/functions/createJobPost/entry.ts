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

    // Server-side AI child labor law screening — the client can never bypass
    // this by calling createJobPost directly with ai_approved: true.
    const screen = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a strict child labor law compliance officer for "KickStart", a marketplace where teenagers aged 13-17 perform casual local jobs for neighbors (federal FLSA "casual employment" context — yard work, babysitting, tutoring, etc.).

Evaluate whether the following job may legally and safely be performed by a teen worker in the U.S. state of ${body.state}. Apply BOTH:
1. Federal FLSA rules, including the Hazardous Occupations Orders — always block: roofing or any work at height (ladders, scaffolding, trees above shoulder height), power-driven machinery (saws, wood chippers, meat slicers), driving a motor vehicle as part of the job, excavation/demolition, electrical or plumbing work, handling chemicals/pesticides/herbicides, work involving alcohol, tobacco, cannabis, firearms, or adult content, and anything sexualized, exploitative, dangerous, or illegal.
2. ${body.state}-specific child labor law, including any stricter state rules on minimum ages for specific tasks (e.g., some states restrict power lawn mower use under 16), permitted hours, and supervision requirements.

Job to evaluate:
- Title: ${title}
- Description: ${body.description || '(none)'}
- Category: ${body.category}
- Pay: $${price}

Respond with:
- allowed: true only if a teen in some age range 13-17 may legally do this job in ${body.state}.
- minimum_age: the minimum teen age (13-17) that may perform it under ${body.state} law. Omit or use 13 if unrestricted.
- reason: if blocked, a clear, neighbor-friendly explanation citing the specific federal or ${body.state} rule that prohibits it. If allowed, a one-sentence confirmation.
- state_law_notes: brief ${body.state}-specific conditions the neighbor should know (age limits, hour limits, supervision). Keep under 40 words.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          allowed: { type: 'boolean' },
          minimum_age: { type: 'number' },
          reason: { type: 'string' },
          state_law_notes: { type: 'string' },
        },
        required: ['allowed', 'reason'],
      },
    });

    if (!screen?.allowed) {
      return Response.json({
        error: screen?.reason || 'This job cannot be posted under child labor laws.',
        screening: screen,
      }, { status: 400 });
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
      ai_approved: true,
      ai_minimum_age: screen.minimum_age || 13,
      ai_law_notes: screen.state_law_notes || '',
    });

    return Response.json({ job, screening: screen });
  } catch (error) {
    console.error('createJobPost error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});