import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { getDeliveryMode, isRemovedCategory } from '../../shared/deliveryMode.ts';
import { calculatePlatformFee, calculateNetAmount } from '../../shared/platformFee.ts';
import { getStripeContext } from '../../shared/stripeEnv.ts';
import { getSafeOrigin, safeOriginFromString } from '../../shared/safeOrigin.ts';

const MAX_UNIT_PRICE = 500;
const MIN_TITLE = 3;
const MAX_TITLE = 120;
const MAX_DESC = 2000;

// Server-side minimum prices per category — the client can never bypass these.
const CATEGORY_MINIMUMS: Record<string, Record<string, number>> = {
  tutoring:    { FIXED: 15, HOURLY: 15 },
  lawn_care:   { FIXED: 20, HOURLY: 15 },
  pet_sitting: { FIXED: 15, HOURLY: 12 },
  tech_help:   { FIXED: 15, HOURLY: 15 },
  car_washing: { FIXED: 20, HOURLY: 15 },
  odd_jobs:    { FIXED: 15, HOURLY: 12 },
};

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

    const description = (body.description || '').trim();
    if (description.length < 10) {
      return Response.json({ error: 'Please add a description of at least 10 characters so teens know what the job involves.' }, { status: 400 });
    }

    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 1 || price > MAX_UNIT_PRICE) {
      return Response.json({ error: `Price must be between $1 and $${MAX_UNIT_PRICE}.` }, { status: 400 });
    }

    // Reject removed categories (babysitting, etc.) — teens never enter a home.
    if (isRemovedCategory(body.category)) {
      return Response.json({
        error: 'This category is no longer available on Blockwork. All work is outdoor or online — teens do not enter clients\' homes.',
      }, { status: 400 });
    }

    // Determine delivery mode from the category — the client can't spoof this.
    const deliveryMode = getDeliveryMode(body.category);
    if (!deliveryMode) {
      return Response.json({ error: 'Invalid category.' }, { status: 400 });
    }
    const isOnline = deliveryMode === 'online';

    // Online jobs never collect or store an address.
    if (isOnline && body.address) {
      return Response.json({
        error: 'Online jobs do not require an address — the session is conducted via video.',
      }, { status: 400 });
    }

    // Server-side minimum-price enforcement per category + price model.
    const priceModel = body.price_model || 'FIXED';
    const mins = CATEGORY_MINIMUMS[body.category] || CATEGORY_MINIMUMS.odd_jobs;
    const minimum = mins[priceModel] || mins.FIXED;
    if (price < minimum) {
      return Response.json({
        error: `The minimum for ${body.category.replace('_', ' ')} jobs is $${minimum}${priceModel === 'HOURLY' ? '/hr' : ''}. Please raise your price.`,
        minimum,
        category: body.category,
        price_model: priceModel,
      }, { status: 400 });
    }

    // CA-only: the buyer must be in California
    const buyerProfiles = await base44.asServiceRole.entities.BuyerProfile.filter({ user_id: user.id });
    if (!buyerProfiles[0] || (buyerProfiles[0].state || '').toUpperCase() !== 'CA') {
      return Response.json({ error: 'Blockwork is currently only available in California.' }, { status: 403 });
    }

    // Server-side AI child labor law screening — the client can never bypass
    // this by calling createJobPost directly with ai_approved: true.
    const screen = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a strict child labor law compliance officer for "Blockwork", a marketplace where teenagers aged 13-19 perform casual local jobs for neighbors. All work is either OUTDOOR (lawn care, car washing, dog walking, yard work — performed outside the residence, never inside a home) or ONLINE (tutoring, remote tech help — conducted via video, no physical meeting). In-home work (babysitting, house cleaning, elder care, in-person tutoring) is PROHIBITED — teens never enter a client's home under any circumstance. Ages 18-19 are legal adults who can perform most non-hazardous work without child-labor restrictions, but the platform still prohibits hazardous tasks for all ages.

Evaluate whether the following job may legally and safely be performed by a teen worker in the U.S. state of ${body.state}. Apply BOTH:
1. Federal FLSA rules, including the Hazardous Occupations Orders — always block for ALL ages: roofing or any work at height (ladders, scaffolding, trees above shoulder height), power-driven machinery (saws, wood chippers, meat slicers), driving a motor vehicle as part of the job, excavation/demolition, electrical or plumbing work, handling chemicals/pesticides/herbicides, work involving alcohol, tobacco, cannabis, firearms, or adult content, and anything sexualized, exploitative, dangerous, or illegal. Also block any job that requires the teen to enter a client's home or have unsupervised in-person one-on-one contact.
2. ${body.state}-specific child labor law, including any stricter state rules on minimum ages for specific tasks (e.g., some states restrict power lawn mower use under 16), permitted hours, and supervision requirements. For ages 18-19, standard child labor laws do not apply, but the hazardous-occupations block above still applies.

Job to evaluate:
- Title: ${title}
- Description: ${body.description || '(none)'}
- Category: ${body.category}
- Pay: $${price}

Respond with:
- allowed: true only if a teen in some age range 13-19 may legally do this job in ${body.state}.
- minimum_age: the minimum teen age (13-19) that may perform it under ${body.state} law. Use 13 if unrestricted. Use 18 only if the task requires adult status (e.g., power equipment restricted to 18+ in this state).
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

    const gross = Math.round(price * 100) / 100;
    const platformFee = calculatePlatformFee(gross);
    const netAmount = calculateNetAmount(gross);

    // Apply any platform credit the neighbor has from previously expired posts.
    // buyerProfiles was already fetched above for the CA-only check.
    const buyerProfile = buyerProfiles[0];
    const credit = Math.min(Number(buyerProfile?.credit_balance) || 0, gross);
    const appliedCredit = Math.round(credit * 100) / 100;
    const chargeAmount = Math.round((gross - appliedCredit) * 100) / 100;
    if (appliedCredit > 0 && buyerProfile) {
      await base44.asServiceRole.entities.BuyerProfile.update(buyerProfile.id, {
        credit_balance: Math.round(((Number(buyerProfile.credit_balance) || 0) - appliedCredit) * 100) / 100,
      });
    }

    // Create the post as a draft — it goes live (open) only after the upfront
    // payment clears (handled by the Stripe webhook). The full job amount is
    // charged upfront and held in escrow until the job is completed; if no teen
    // takes it within 7 days, the neighbor chooses a refund or platform credit.
    const job = await base44.asServiceRole.entities.JobPost.create({
      buyer_user_id: user.id,
      buyer_name: body.buyerName || 'Neighbor',
      title,
      description: (body.description || '').trim().slice(0, MAX_DESC),
      category: body.category,
      delivery_mode: deliveryMode,
      price,
      price_model: body.price_model || 'FIXED',
      zip: body.zip || '',
      state: body.state,
      is_physical: !isOnline,
      address: isOnline ? '' : (body.address || '').trim(),
      scheduled_start: body.scheduledStart || undefined,
      ai_approved: true,
      ai_minimum_age: screen.minimum_age || 13,
      ai_law_notes: screen.state_law_notes || '',
      is_asap: !!body.is_asap,
      status: 'draft',
      charge_amount: chargeAmount,
      applied_credit: appliedCredit,
      platform_fee: platformFee,
      net_amount: netAmount,
      payment_status: 'unpaid',
    });

    const { stripe, testMode } = await getStripeContext(base44);
    const origin = body.origin ? safeOriginFromString(body.origin) : getSafeOrigin(req);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Full credit covered the post — no Stripe charge, go live immediately.
    if (chargeAmount <= 0) {
      await base44.asServiceRole.entities.JobPost.update(job.id, {
        status: 'open',
        payment_status: 'held',
        expires_at: expiresAt,
        is_test_mode: testMode,
      });
      return Response.json({
        job: { ...job, status: 'open', payment_status: 'held', expires_at: expiresAt },
        paid: true,
        screening: screen,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: job.title || 'Blockwork job post',
            description: 'Held in escrow until a teen completes the job. Refunded if no teen takes it within 7 days.',
          },
          unit_amount: Math.round(chargeAmount * 100),
        },
        quantity: 1,
      }],
      success_url: `${origin}/jobs?posted=1`,
      cancel_url: `${origin}/jobs`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        job_post_id: job.id,
      },
      payment_intent_data: { metadata: { job_post_id: job.id, base44_app_id: Deno.env.get('BASE44_APP_ID') } },
    });

    await base44.asServiceRole.entities.JobPost.update(job.id, {
      stripe_session_id: session.id,
      is_test_mode: testMode,
    });

    return Response.json({ job, url: session.url, screening: screen });
  } catch (error) {
    console.error('createJobPost error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});