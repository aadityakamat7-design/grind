import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { writeAuditLog } from '../../shared/auditLog.ts';
import { getClientIp } from '../../shared/rateLimiter.ts';

// "Download my data" — one JSON file with the account's own details, bookings,
// messages and reports. Assembled server-side and scoped to the caller, so it
// can only ever contain that person's records.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole.entities;
    const role = String(user.app_role || '').toLowerCase();

    const [settings, teenagerProfiles, teenPrivate, parentProfiles, buyerProfiles, addresses, reports] = await Promise.all([
      svc.AccountSettings.filter({ user_id: user.id }),
      svc.TeenProfile.filter({ user_id: user.id }),
      svc.TeenPrivateData.filter({ user_id: user.id }),
      svc.ParentProfile.filter({ user_id: user.id }),
      svc.BuyerProfile.filter({ user_id: user.id }),
      svc.SavedAddress.filter({ user_id: user.id }),
      svc.Report.filter({ reporter_id: user.id }, '-created_date', 100),
    ]);

    const [asBuyer, asTeen, asParent, messages] = await Promise.all([
      svc.Booking.filter({ buyer_user_id: user.id }, '-scheduled_start', 200),
      svc.Booking.filter({ teen_user_id: user.id }, '-scheduled_start', 200),
      svc.Booking.filter({ parent_user_id: user.id }, '-scheduled_start', 200),
      svc.Message.filter({ participant_ids: { $in: [user.id] } }, '-created_date', 500),
    ]);

    const seen = new Set<string>();
    const bookings = [...asBuyer, ...asTeen, ...asParent].filter((b: any) => {
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });

    const data = {
      exported_at: new Date().toISOString(),
      about_this_file: 'Your Blockwork account export: your details, your bookings, your messages and any reports you filed.',
      account: {
        id: user.id,
        full_name: user.full_name || '',
        email: user.email || '',
        contact_email: user.contact_email || '',
        role,
        account_status: user.account_status || 'active',
        member_since: user.created_date,
        phone: settings[0]?.phone || user.recovery_phone || '',
        notification_preferences: settings[0]?.notifications || null,
        date_of_birth: user.date_of_birth || '',
      },
      profile: {
        teen: teenagerProfiles[0] || null,
        teen_private: teenPrivate[0] || null,
        parent: parentProfiles[0] || null,
        buyer: buyerProfiles[0] || null,
      },
      saved_addresses: addresses,
      bookings: bookings.map((b: any) => ({
        id: b.id,
        listing_title: b.listing_title,
        status: b.status,
        scheduled_start: b.scheduled_start,
        address: b.address || '',
        price_total: b.price_total,
        tip_amount: b.tip_amount || 0,
        platform_fee: b.platform_fee,
        net_amount: b.net_amount,
        payment_status: b.payment_status,
        payout_status: b.payout_status,
        estimated_hours: b.estimated_hours,
        delivery_mode: b.delivery_mode,
        created_date: b.created_date,
        completed_at: b.buyer_finished_at || b.teen_finished_at || '',
      })),
      messages: messages.map((m: any) => ({
        thread_id: m.thread_id,
        sender_id: m.sender_id,
        body: m.body,
        sent_at: m.created_date,
      })),
      reports_filed: reports.map((r: any) => ({
        id: r.id,
        reason: r.reason,
        details: r.details,
        status: r.status,
        filed_at: r.created_date,
      })),
    };

    await writeAuditLog(base44, {
      actor_user_id: user.id, actor_role: role, action: 'account_data_exported',
      category: 'security', target_type: 'User', target_id: user.id,
      summary: 'Account holder downloaded their data',
      metadata: { bookings: bookings.length, messages: messages.length, reports: reports.length },
      ip: getClientIp(req),
    });

    return Response.json({ ok: true, filename: `blockwork-account-${user.id.slice(-6)}.json`, data });
  } catch (error: any) {
    console.error('accountExport error:', error?.message || error);
    return Response.json({ error: 'Could not build your export right now. Please try again.' }, { status: 500 });
  }
});