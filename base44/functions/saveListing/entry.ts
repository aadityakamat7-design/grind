import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { isAccountSuspended, suspendedError } from '../../shared/accountStatus.ts';
import { checkHazard } from '../../shared/hazardCheck.ts';
import { getVerifiedAge } from '../../shared/teenAge.ts';
import { getMinAgeForCategory } from '../../shared/categoryAgeRules.ts';
import { getDeliveryMode, isRemovedCategory } from '../../shared/deliveryMode.ts';
import { getHourLimits } from '../../shared/stateHourLimits.ts';
import { MAX_UNIT_PRICE, MIN_UNIT_PRICE, MAX_ESTIMATED_HOURS } from '../../shared/pricing.ts';
import { resolveWorkEligibility, PARENT_LINK_REQUIRED } from '../../shared/parentGate.ts';
import { availabilitySlotBreaches } from '../../shared/parentLimits.ts';

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
    if (isAccountSuspended(user)) return suspendedError();

    const body = await req.json();
    const title = (body.title || '').trim();
    if (title.length < MIN_TITLE) {
      return Response.json({ error: `Title must be at least ${MIN_TITLE} characters.` }, { status: 400 });
    }
    if (title.length > MAX_TITLE) {
      return Response.json({ error: `Title must be at most ${MAX_TITLE} characters.` }, { status: 400 });
    }

    const price = Number(body.price);
    if (!Number.isFinite(price) || price < MIN_UNIT_PRICE || price > MAX_UNIT_PRICE) {
      return Response.json({ error: `Price must be at least $${MIN_UNIT_PRICE} and at most $${MAX_UNIT_PRICE}.` }, { status: 400 });
    }

    // For hourly listings, validate estimated hours (1–MAX_ESTIMATED_HOURS).
    const priceModel = body.price_model || 'FIXED';
    let estimatedHours: number | undefined;
    if (priceModel === 'HOURLY') {
      estimatedHours = Number(body.estimated_hours);
      if (!Number.isFinite(estimatedHours) || estimatedHours < 1 || estimatedHours > MAX_ESTIMATED_HOURS) {
        return Response.json({ error: `Please select an estimated duration (1–${MAX_ESTIMATED_HOURS} hours).` }, { status: 400 });
      }
    }

    const svc = base44.asServiceRole.entities;

    // Working requires a linked parent (or an independent 18+ teen). Resolved
    // on the server so a direct API call can't post a service without one.
    const eligibility = await resolveWorkEligibility(svc, user.id);
    const teenProfile = eligibility.profile;
    if (!teenProfile || teenProfile.status === 'suspended') {
      return Response.json({ error: 'Your account is not active yet.' }, { status: 403 });
    }
    if (!eligibility.canWork) {
      return Response.json({ error: PARENT_LINK_REQUIRED, needsParent: true }, { status: 403 });
    }
    // CA-only: the teen must be in California
    if ((teenProfile.state || '').toUpperCase() !== 'CA') {
      return Response.json({ error: 'Blockwork is currently only available in California.' }, { status: 403 });
    }

    // Server-side hazard screening — a client can't bypass this by calling
    // saveListing directly with a prohibited task.
    const privateData = await svc.TeenPrivateData.filter({ user_id: user.id });
    const age = getVerifiedAge(privateData[0]) ?? 18;
    const hourLimits = getHourLimits(teenProfile.state, age);
    const hazard = checkHazard(`${title} ${body.description || ''}`, age);
    if (hazard.flagged) {
      return Response.json({ error: hazard.reason }, { status: 400 });
    }

    // Reject removed categories (babysitting, etc.) — teens never enter a home.
    if (isRemovedCategory(body.category)) {
      return Response.json(
        { error: 'This category is no longer available on Blockwork. All work is outdoor or online — teens do not enter neighbors\' homes.' },
        { status: 400 }
      );
    }

    // Validate availability — each slot needs day (0-6), start, and end
    const availability = Array.isArray(body.availability) ? body.availability : [];
    for (const slot of availability) {
      if (typeof slot.day !== 'number' || slot.day < 0 || slot.day > 6) {
        return Response.json({ error: 'Invalid availability day.' }, { status: 400 });
      }
      if (!slot.start || !slot.end) {
        return Response.json({ error: 'Each availability slot needs a start and end time.' }, { status: 400 });
      }
      const startH = parseInt(String(slot.start).split(':')[0]);
      const endH = parseInt(String(slot.end).split(':')[0]);
      if (isNaN(startH) || isNaN(endH) || endH <= startH) {
        return Response.json({ error: 'Availability end time must be after start time.' }, { status: 400 });
      }
    }

    // A parent can narrow when their teen is allowed to work. Availability that
    // breaches those limits is rejected here, not just filtered in the picker.
    const linkRows = await svc.ParentTeenLink.filter({ teen_user_id: user.id, status: 'confirmed' });
    const parentLimits = linkRows[0]?.limits || null;
    for (const slot of availability) {
      const breach = availabilitySlotBreaches(slot, parentLimits);
      if (breach) {
        return Response.json({ error: breach, parentLimit: true }, { status: 403 });
      }
    }

    // Determine delivery mode from the category — the client can't spoof this.
    const deliveryMode = getDeliveryMode(body.category);
    if (!deliveryMode) {
      return Response.json({ error: 'Invalid category.' }, { status: 400 });
    }

    // Category age gate — reject any category the teen isn't old enough for
    // in their state. Uses the verified age (Stripe DOB via getVerifiedAge),
    // never the self-reported age. A direct API call can't bypass this.
    const minAge = getMinAgeForCategory(teenProfile.state, body.category);
    if (age < minAge) {
      return Response.json(
        { error: `This category requires age ${minAge}+ in your state. You'll be eligible when you turn ${minAge}.` },
        { status: 403 }
      );
    }

    // A minor's service stays hidden from neighbors ('draft') until their linked
    // parent approves it. An independent 18+ teen publishes immediately.
    const needsParentApproval = !eligibility.isIndependentAdult;

    const data = {
      category: body.category,
      delivery_mode: deliveryMode,
      title,
      description: (body.description || '').trim().slice(0, MAX_DESC),
      price_model: priceModel,
      price,
      estimated_hours: estimatedHours,
      service_area: body.zip || '',
      teen_zip: body.zip || '',
      parent_approval_status: needsParentApproval ? 'pending' : 'approved',
      status: needsParentApproval ? 'draft' : 'published',
      availability,
      teen_hour_limits: hourLimits,
    };

    let listing;
    let approvalRequested = false;
    if (body.listingId) {
      const existing = await svc.Listing.get(body.listingId);
      if (!existing || existing.teen_user_id !== user.id) {
        return Response.json({ error: 'Listing not found.' }, { status: 404 });
      }
      // Price, category and service area decide what a neighbor pays and where
      // the work happens — changing any of them sends the service back to the
      // parent for re-approval. Text-only edits keep the existing approval.
      const termsChanged =
        Number(existing.price) !== Number(price) ||
        existing.price_model !== priceModel ||
        existing.category !== body.category ||
        (existing.service_area || '') !== (body.zip || '');

      let update: Record<string, unknown> = data;
      if (needsParentApproval && termsChanged) {
        approvalRequested = true;
      } else {
        // Visibility and approval state are untouched by this edit.
        const { status: _status, parent_approval_status: _approval, ...rest } = data;
        update = rest;
      }
      await svc.Listing.update(body.listingId, update);
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
      if (needsParentApproval) {
        approvalRequested = true;
      } else {
        base44.analytics.track({ eventName: 'listing_published' });
      }
    }

    // Ask the parent to approve, so a new service isn't silently stuck hidden.
    if (approvalRequested && eligibility.link?.parent_user_id) {
      await svc.Notification.create({
        user_id: eligibility.link.parent_user_id,
        type: 'approval',
        title: 'A new service needs your approval',
        body: `"${title}" from ${teenProfile.display_name || 'your teen'} is hidden from neighbors until you approve it.`,
        link: '/parent/approvals',
        read: false,
      });
    }

    return Response.json({ listing, parentApprovalPending: approvalRequested });
  } catch (error) {
    console.error('saveListing error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});