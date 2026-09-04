import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getVerifiedAge } from '../../shared/teenAge.ts';
import { getMinAgeForCategory } from '../../shared/categoryAgeRules.ts';
import { getDeliveryMode, isRemovedCategory, generateSessionLink } from '../../shared/deliveryMode.ts';
import { notifyParentJobAccepted } from '../../shared/notifyParent.ts';
import { getSafeOrigin } from '../../shared/safeOrigin.ts';
import { enforceBookingHours } from '../../shared/workHourEnforcement.ts';
import { calculatePlatformFee, calculateNetAmount } from '../../shared/platformFee.ts';

// Runs the teen's "take this job" flow server-side, since JobPost.status is
// locked to admin/service-role writes (so a buyer/teen can never flip a job
// to "open"/"assigned" directly and bypass the posting-fee payment gate).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { jobId } = await req.json();
    if (!jobId) return Response.json({ error: 'jobId required' }, { status: 400 });

    const svc = base44.asServiceRole.entities;

    const job = await svc.JobPost.get(jobId);
    if (!job) return Response.json({ error: 'Job not found' }, { status: 404 });
    if (job.status !== 'open') {
      return Response.json({ error: 'This job is no longer available.' }, { status: 400 });
    }

    // Guard: a teen can't accept a job posted by their own parent — prevents
    // self-dealing and fake bookings to game ratings/earnings.
    const selfDealingLinks = await svc.ParentTeenLink.filter({
      parent_user_id: job.buyer_user_id,
      teen_user_id: user.id,
      status: 'confirmed',
    });
    if (selfDealingLinks.length > 0) {
      return Response.json({ error: "You can't accept a job posted by your own parent." }, { status: 403 });
    }

    // Reject removed categories (babysitting, etc.) — teens never enter a home.
    if (isRemovedCategory(job.category)) {
      return Response.json({ error: 'This category is no longer available on Blockwork.' }, { status: 400 });
    }
    const deliveryMode = job.delivery_mode || getDeliveryMode(job.category) || 'outdoor';
    const isOnline = deliveryMode === 'online';

    const [profiles, links, privateData, buyerProfiles] = await Promise.all([
      svc.TeenProfile.filter({ user_id: user.id }),
      svc.ParentTeenLink.filter({ teen_user_id: user.id, status: 'confirmed' }),
      svc.TeenPrivateData.filter({ user_id: user.id }),
      svc.BuyerProfile.filter({ user_id: job.buyer_user_id }),
    ]);
    const profile = profiles[0];
    const link = links[0];
    const teenPrivate = privateData[0];
    const buyerProfile = buyerProfiles[0];

    if (profile?.status === 'suspended') {
      return Response.json({ error: "Your account has been suspended." }, { status: 403 });
    }
    // CA-only: the teen must be in California
    if ((profile?.state || '').toUpperCase() !== 'CA') {
      return Response.json({ error: 'Blockwork is currently only available in California.' }, { status: 403 });
    }
    const teenAge = getVerifiedAge(teenPrivate);

    // Category age gate — reject if the job's category exceeds the teen's
    // eligible age for their state. Uses the verified age, never self-reported.
    const categoryMinAge = getMinAgeForCategory(job.state, job.category);
    if (teenAge != null && teenAge < categoryMinAge) {
      return Response.json(
        { error: `This category requires age ${categoryMinAge}+ in ${job.state}. You'll be eligible when you turn ${categoryMinAge}.` },
        { status: 403 }
      );
    }
    if (job.ai_minimum_age && teenAge != null && teenAge < job.ai_minimum_age) {
      return Response.json({ error: `This job requires workers age ${job.ai_minimum_age}+ under ${job.state} law.` }, { status: 403 });
    }

    // No verification gate — teens can take jobs freely. Parent link is
    // only used for notifications and payout routing at withdrawal time.
    const parentUserId = link?.parent_user_id || '';

    const gross = Number(job.price) || 0;
    const platformFee = job.platform_fee != null ? job.platform_fee : calculatePlatformFee(gross);
    const netAmount = job.net_amount != null ? job.net_amount : calculateNetAmount(gross);

    // Enforce state child-labor hour limits before claiming the job, so a teen
    // over their daily/weekly limit or in a prohibited time window can't accept.
    const estimatedHours = 2; // job posts don't capture duration
    const hourCheck = await enforceBookingHours(base44, {
      teenUserId: user.id,
      state: job.state,
      age: teenAge,
      scheduledStart: job.scheduled_start,
      estimatedHours,
    });
    if (!hourCheck.ok) {
      return Response.json({ error: hourCheck.reason, nextEligible: hourCheck.nextEligible }, { status: 403 });
    }

    // Atomically claim the job — prevents a race condition where two teens
    // accept the same job at nearly the same time. The updateMany filter
    // includes status: 'open', so if another teen already claimed it, this
    // matches 0 records and we return a clear error.
    const claimResult = await svc.JobPost.updateMany(
      { id: jobId, status: 'open' },
      { $set: {
        status: 'assigned',
        assigned_teen_user_id: user.id,
        assigned_teen_name: profile?.display_name || user.full_name,
      }}
    );
    const claimed = (claimResult?.updated ?? 0) > 0;
    if (!claimed) {
      return Response.json({ error: 'This job has already been taken by another teen.' }, { status: 409 });
    }

    const booking = await svc.Booking.create({
      listing_title: job.title,
      teen_user_id: user.id,
      teen_display_name: profile?.display_name || user.full_name,
      parent_user_id: parentUserId || undefined,
      buyer_user_id: job.buyer_user_id,
      buyer_name: job.buyer_name,
      scheduled_start: job.scheduled_start || undefined,
      delivery_mode: deliveryMode,
      notes: job.description,
      address: isOnline ? '' : (job.is_physical ? job.address : ''),
      is_physical: !isOnline,
      price_total: job.price,
      charge_amount: job.charge_amount ?? job.price,
      estimated_hours: estimatedHours,
      platform_fee: platformFee,
      net_amount: netAmount,
      payment_status: 'unpaid',
      status: 'confirmed',
    });

    await svc.JobPost.update(job.id, { booking_id: booking.id });

    // For online jobs, generate the video session link now that we have the
    // booking ID, and attach it to the booking.
    if (isOnline) {
      await svc.Booking.update(booking.id, { session_link: generateSessionLink(booking.id) });
    }

    await svc.MessageThread.create({
      booking_id: booking.id,
      listing_title: job.title,
      buyer_user_id: job.buyer_user_id,
      buyer_name: job.buyer_name,
      teen_user_id: user.id,
      teen_display_name: profile?.display_name || user.full_name,
      parent_user_id: parentUserId || undefined,
      participant_ids: [job.buyer_user_id, user.id, parentUserId || null].filter(Boolean),
      is_confirmed: true,
    });

    if (parentUserId) {
      await svc.Notification.create({
        user_id: parentUserId,
        type: 'booking',
        title: 'Your teen took a job',
        body: `${profile?.display_name || 'Your teen'} accepted "${job.title}" for ${job.buyer_name}.`,
        link: `/bookings/${booking.id}`,
        read: false,
      });

      // Email the parent about the accepted job. If their payout setup
      // (bank connection) is incomplete, the email guides them through
      // the setup flow via a deep link — needed only at withdrawal time.
      const parentProfiles = await svc.ParentProfile.filter({ user_id: parentUserId });
      const pp = parentProfiles[0];
      const setupNeeded = pp?.connect_status !== 'active';
      await notifyParentJobAccepted(base44.asServiceRole, {
        teenName: profile?.display_name || 'Your teen',
        jobTitle: job.title,
        buyerName: job.buyer_name,
        parentUserId: parentUserId,
        origin: getSafeOrigin(req),
        setupNeeded,
      });
    }
    await svc.Notification.create({
      user_id: job.buyer_user_id,
      type: 'booking',
      title: 'A teen took your job!',
      body: `${profile?.display_name || 'A teen'} accepted "${job.title}" — confirmed!`,
      link: `/bookings/${booking.id}`,
      read: false,
    });

    return Response.json({ success: true, bookingId: booking.id });
  } catch (error) {
    console.error('acceptJobPost error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});