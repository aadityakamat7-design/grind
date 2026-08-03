import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getVerifiedAge } from '../../shared/teenAge.ts';
import { notifyParentJobAccepted } from '../../shared/notifyParent.ts';
import { getSafeOrigin } from '../../shared/safeOrigin.ts';

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

    const [profiles, links, privateData, buyerProfiles] = await Promise.all([
      svc.TeenProfile.filter({ user_id: user.id }),
      svc.ParentTeenLink.filter({ teen_user_id: user.id }),
      svc.TeenPrivateData.filter({ user_id: user.id }),
      svc.BuyerProfile.filter({ user_id: job.buyer_user_id }),
    ]);
    const profile = profiles[0];
    const link = links[0];
    const teenPrivate = privateData[0];
    const buyerProfile = buyerProfiles[0];

    if (profile?.status !== 'active') {
      return Response.json({ error: "Your account isn't live yet — your parent must verify their ID and confirm your link before you can take jobs." }, { status: 403 });
    }
    const teenAge = getVerifiedAge(teenPrivate);
    if (job.ai_minimum_age && teenAge != null && teenAge < job.ai_minimum_age) {
      return Response.json({ error: `This job requires workers age ${job.ai_minimum_age}+ under ${job.state} law.` }, { status: 403 });
    }

    const gross = Number(job.price) || 0;
    const platformFee = job.platform_fee != null ? job.platform_fee : Math.round(gross * 0.15 * 100) / 100;
    const netAmount = job.net_amount != null ? job.net_amount : Math.round((gross - platformFee) * 100) / 100;

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
      parent_user_id: link?.parent_user_id,
      buyer_user_id: job.buyer_user_id,
      buyer_name: job.buyer_name,
      scheduled_start: job.scheduled_start || undefined,
      notes: job.description,
      address: job.is_physical ? job.address : '',
      is_physical: job.is_physical !== false,
      price_total: job.price,
      charge_amount: job.charge_amount ?? job.price,
      platform_fee: platformFee,
      net_amount: netAmount,
      payment_status: 'unpaid',
      status: 'pending_parent_approval',
    });

    await svc.JobPost.update(job.id, { booking_id: booking.id });

    // The teen must verify their own identity the first time they accept a
    // job. The booking is created in pending_parent_approval either way; the
    // parent can only approve once the teen is verified.
    const identityRequired = profile.identity_status !== 'verified';

    await svc.MessageThread.create({
      booking_id: booking.id,
      listing_title: job.title,
      buyer_user_id: job.buyer_user_id,
      buyer_name: job.buyer_name,
      teen_user_id: user.id,
      teen_display_name: profile?.display_name || user.full_name,
      parent_user_id: link?.parent_user_id,
      participant_ids: [job.buyer_user_id, user.id, link?.parent_user_id].filter(Boolean),
      is_confirmed: false,
    });

    if (link?.parent_user_id) {
      await svc.Notification.create({
        user_id: link.parent_user_id,
        type: 'approval',
        title: 'New job needs your approval',
        body: `${profile?.display_name || 'Your teen'} wants to take "${job.title}" for ${job.buyer_name}.`,
        link: `/bookings/${booking.id}`,
        read: false,
      });

      // Email the parent about the accepted job. If their payout setup
      // (identity verification + bank connection) is incomplete, the email
      // guides them through the setup flow via a deep link.
      const parentProfiles = await svc.ParentProfile.filter({ user_id: link.parent_user_id });
      const pp = parentProfiles[0];
      const setupNeeded = !pp?.is_identity_verified || pp?.connect_status !== 'active';
      await notifyParentJobAccepted(base44.asServiceRole, {
        teenName: profile?.display_name || 'Your teen',
        jobTitle: job.title,
        buyerName: job.buyer_name,
        parentUserId: link.parent_user_id,
        origin: getSafeOrigin(req),
        setupNeeded,
      });
    }
    await svc.Notification.create({
      user_id: job.buyer_user_id,
      type: 'booking',
      title: 'A teen took your job!',
      body: `${profile?.display_name || 'A teen'} accepted "${job.title}" — pending parent approval.`,
      link: `/bookings/${booking.id}`,
      read: false,
    });

    return Response.json({ success: true, bookingId: booking.id, identityRequired });
  } catch (error) {
    console.error('acceptJobPost error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});