import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { requireAdmin } from '../../shared/adminAction.ts';
import { getStripeForApp, getTestModeEnabled } from '../../shared/stripeEnv.ts';

// Read-only payment history for admin support. Three scopes:
//   ledger  — every payment the marketplace recorded, filtered server-side
//   user    — one person's payment records across all three roles
//   booking — one booking, reconciled live against Stripe
// Nothing here writes: this is a read/reconcile surface only.
//
// Filtering, counting and totals all happen against the database — the rows are
// never loaded to be filtered or summed in the browser.
const MAX_LIMIT = 2000;
const PAID = ['held', 'releasing', 'released', 'refunded'];
const PAYMENT_STATUSES = ['unpaid', 'held', 'releasing', 'released', 'refunded', 'payment_failed'];
// Sub-minimum charges never reach Stripe — the app records them synthetically.
const SYNTHETIC_PREFIX = 'submin_';

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function byNewest(a, b) {
  return new Date(b.created_date || 0) - new Date(a.created_date || 0);
}

// The money-relevant slice of a booking, in the shape the admin list shows.
function bookingRow(b) {
  return {
    kind: 'booking',
    id: b.id,
    booking_id: b.id,
    title: b.listing_title || '',
    buyer_name: b.buyer_name || '',
    teen_name: b.teen_display_name || '',
    buyer_user_id: b.buyer_user_id || '',
    teen_user_id: b.teen_user_id || '',
    parent_user_id: b.parent_user_id || '',
    booking_status: b.status || '',
    payment_status: b.payment_status || 'unpaid',
    payout_status: b.payout_status || '',
    price_total: round2(b.price_total),
    charge_amount: round2(b.charge_amount),
    platform_fee: round2(b.platform_fee),
    net_amount: round2(b.net_amount),
    tip_amount: round2(b.tip_amount),
    admin_refund_amount: round2(b.admin_refund_amount),
    payment_intent_id: b.stripe_payment_intent_id || '',
    transfer_id: b.stripe_transfer_id || '',
    tip_payment_intent_id: b.tip_stripe_payment_intent_id || '',
    is_test_mode: b.is_test_mode === true,
    payout_hold: b.payout_hold === true,
    created_date: b.created_date || '',
    // The money moment for this record: when it moved, else when it was created.
    at: b.released_at || b.transferred_at || b.updated_date || b.created_date || '',
  };
}

// Checks that need no Stripe call — disagreements inside our own records.
function appProblems(r) {
  const problems = [];
  const isPaid = PAID.includes(r.payment_status);
  if (isPaid && !r.payment_intent_id) {
    problems.push('Marked as paid but no Stripe payment is recorded');
  }
  if (r.payment_status === 'released' && !r.transfer_id) {
    problems.push('Released to the teen but no Stripe transfer is recorded');
  }
  if (r.payment_status === 'refunded' && r.admin_refund_amount <= 0) {
    problems.push('Marked refunded but no refund amount is recorded');
  }
  if (r.payment_status === 'held' && r.status === 'completed') {
    problems.push('Job completed while the neighbor\u2019s payment is still held');
  }
  if (r.charge_amount > 0 && r.net_amount > r.charge_amount) {
    problems.push('The teen\u2019s net is larger than what the neighbor was charged');
  }
  return problems;
}

function readFilters(body) {
  const query = {};
  const status = String(body?.paymentStatus || 'all');
  if (status !== 'all') {
    if (!PAYMENT_STATUSES.includes(status)) return { error: 'Unknown payment status filter' };
    query.payment_status = status;
  }

  const from = String(body?.from || '').trim();
  const to = String(body?.to || '').trim();
  if (from || to) {
    const range = {};
    if (from) {
      const d = new Date(`${from}T00:00:00.000Z`);
      if (isNaN(d.getTime())) return { error: 'from must be a YYYY-MM-DD date' };
      range.$gte = d.toISOString();
    }
    if (to) {
      const d = new Date(`${to}T23:59:59.999Z`);
      if (isNaN(d.getTime())) return { error: 'to must be a YYYY-MM-DD date' };
      range.$lte = d.toISOString();
    }
    if (range.$gte && range.$lte && range.$gte > range.$lte) {
      return { error: 'The start date must come before the end date.' };
    }
    query.created_date = range;
  }

  const search = String(body?.search || '').trim().slice(0, 80);
  if (search) {
    const safe = escapeRegex(search);
    query.$or = [
      { listing_title: { $regex: safe, $options: 'i' } },
      { buyer_name: { $regex: safe, $options: 'i' } },
      { teen_display_name: { $regex: safe, $options: 'i' } },
      { stripe_payment_intent_id: { $regex: safe, $options: 'i' } },
      { stripe_transfer_id: { $regex: safe, $options: 'i' } },
    ];
  }

  const limit = Math.min(Math.max(Number(body?.limit) || 100, 1), MAX_LIMIT);
  return { query, limit, mismatchesOnly: body?.mismatchesOnly === true, searchApplied: !!search };
}

// Live comparison of one booking against the Stripe objects it points at.
async function reconcileWithStripe(stripe, row, testMode) {
  const live = { checked: false, payment_intent: null, refunds: [], transfer: null, tip_payment_intent: null };
  const problems = [];

  const piId = row.payment_intent_id;
  if (!piId) return { live, problems };
  live.checked = true;

  if (piId.startsWith(SYNTHETIC_PREFIX)) {
    // A sub-minimum charge the app settled without Stripe — nothing to look up.
    live.synthetic = true;
    return { live, problems };
  }

  // A booking taken under the other Stripe mode lives in a different account, so
  // comparing it against the connected one would report a false failure.
  if (row.is_test_mode !== testMode) {
    live.otherMode = row.is_test_mode ? 'test' : 'live';
    return { live, problems };
  }

  try {
    const pi = await stripe.paymentIntents.retrieve(piId, { expand: ['latest_charge'] });
    const charge = pi.latest_charge && typeof pi.latest_charge === 'object' ? pi.latest_charge : null;
    const stripeCharged = charge ? round2(charge.amount / 100) : round2(pi.amount / 100);
    const refunds = (charge?.refunds?.data || []).map((r) => ({
      id: r.id,
      amount: round2(r.amount / 100),
      status: r.status,
      reason: r.reason || '',
      created: r.created ? new Date(r.created * 1000).toISOString() : '',
    }));
    const stripeRefunded = round2(
      refunds.filter((r) => r.status === 'succeeded').reduce((sum, r) => sum + r.amount, 0),
    );

    live.payment_intent = {
      id: pi.id,
      status: pi.status,
      amount: round2(pi.amount / 100),
      amount_received: round2(pi.amount_received / 100),
      currency: pi.currency,
      livemode: pi.livemode === true,
      created: pi.created ? new Date(pi.created * 1000).toISOString() : '',
    };
    live.refunds = refunds;
    live.refunds_total = stripeRefunded;
    live.charged_total = stripeCharged;

    if (PAID.includes(row.payment_status) && !['succeeded', 'processing'].includes(pi.status)) {
      problems.push(`App records the payment as ${row.payment_status.replace(/_/g, ' ')}, but Stripe shows "${pi.status}"`);
    }
    if (row.charge_amount > 0 && Math.abs(stripeCharged - row.charge_amount) >= 0.01) {
      problems.push(`App records ${row.charge_amount.toFixed(2)} charged, Stripe shows ${stripeCharged.toFixed(2)}`);
    }
    if (row.admin_refund_amount > 0 && Math.abs(stripeRefunded - row.admin_refund_amount) >= 0.01) {
      problems.push(`App records ${row.admin_refund_amount.toFixed(2)} refunded, Stripe shows ${stripeRefunded.toFixed(2)}`);
    }
    if (row.admin_refund_amount <= 0 && stripeRefunded > 0) {
      problems.push(`Stripe shows ${stripeRefunded.toFixed(2)} refunded, but the app records no refund`);
    }
    if (row.payment_status === 'refunded' && stripeRefunded <= 0) {
      problems.push('App records a refund, but Stripe shows none on this payment');
    }
  } catch (err) {
    live.error = err.message;
    problems.push(`Stripe lookup failed for this payment: ${err.message}`);
  }

  if (row.transfer_id) {
    try {
      const t = await stripe.transfers.retrieve(row.transfer_id);
      live.transfer = {
        id: t.id,
        amount: round2(t.amount / 100),
        currency: t.currency,
        reversed: t.reversed === true,
        created: t.created ? new Date(t.created * 1000).toISOString() : '',
      };
      if (t.reversed) problems.push('The Stripe transfer to the teen was reversed');
    } catch (err) {
      live.transfer_error = err.message;
      problems.push(`Stripe lookup failed for the payout transfer: ${err.message}`);
    }
  }

  if (row.tip_payment_intent_id && !row.tip_payment_intent_id.startsWith(SYNTHETIC_PREFIX)) {
    try {
      const tip = await stripe.paymentIntents.retrieve(row.tip_payment_intent_id);
      live.tip_payment_intent = {
        id: tip.id,
        status: tip.status,
        amount: round2(tip.amount / 100),
        livemode: tip.livemode === true,
      };
      if (row.tip_amount > 0 && tip.status !== 'succeeded') {
        problems.push(`App records a ${row.tip_amount.toFixed(2)} tip, but Stripe shows that charge as "${tip.status}"`);
      }
    } catch (err) {
      live.tip_error = err.message;
      problems.push(`Stripe lookup failed for the tip: ${err.message}`);
    }
  }

  return { live, problems };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44, req);
    if (auth.error) return auth.error;

    const body = await req.json().catch(() => ({}));
    const scope = String(body?.scope || 'ledger');
    if (!['ledger', 'user', 'booking'].includes(scope)) {
      return Response.json({ error: 'scope must be ledger, user, or booking' }, { status: 400 });
    }

    const svc = base44.asServiceRole.entities;
    const filters = readFilters(body);
    if (filters.error) return Response.json({ error: filters.error }, { status: 400 });

    // ---- one booking, reconciled live against Stripe ----
    if (scope === 'booking') {
      const bookingId = String(body?.bookingId || '').trim();
      if (!bookingId) return Response.json({ error: 'bookingId required' }, { status: 400 });
      const booking = await svc.Booking.get(bookingId).catch(() => null);
      if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });

      const row = bookingRow(booking);
      const stripe = await getStripeForApp(base44);
      const testMode = await getTestModeEnabled(base44);
      const { live, problems } = await reconcileWithStripe(stripe, row, testMode);
      const all = [...appProblems(row), ...problems];
      return Response.json({ scope, testMode, row, live, problems: all, mismatch: all.length > 0 });
    }

    // ---- one person's payment records across all three roles ----
    if (scope === 'user') {
      const userId = String(body?.userId || '').trim();
      if (!userId) return Response.json({ error: 'userId required' }, { status: 400 });

      const found = new Map();
      for (const field of ['buyer_user_id', 'teen_user_id', 'parent_user_id']) {
        const page = await svc.Booking.filter({ ...filters.query, [field]: userId }, {
          sort: '-created_date',
          limit: filters.limit,
        });
        for (const b of page?.items || []) found.set(b.id, b);
      }

      let rows = [...found.values()].sort(byNewest).map((b) => {
        const row = bookingRow(b);
        return { ...row, problems: appProblems(row) };
      });
      if (filters.mismatchesOnly) rows = rows.filter((r) => r.problems.length > 0);

      return Response.json({
        scope,
        userId,
        rows,
        count: found.size,
        shown: rows.length,
        role: null,
      });
    }

    // ---- the whole ledger: filtered rows plus real totals for the filter ----
    const [page, count, agg] = await Promise.all([
      svc.Booking.filter(filters.query, { sort: '-created_date', limit: filters.limit }),
      svc.Booking.count(filters.query),
      svc.Booking.aggregate({
        query: filters.query,
        sum: ['charge_amount', 'admin_refund_amount', 'net_amount', 'tip_amount'],
      }),
    ]);

    let rows = (page?.items || []).map((b) => {
      const row = bookingRow(b);
      return { ...row, problems: appProblems(row) };
    });
    if (filters.mismatchesOnly) rows = rows.filter((r) => r.problems.length > 0);

    const totals = agg?.rows?.[0] || {};
    return Response.json({
      scope,
      rows,
      count,
      shown: rows.length,
      totals: {
        charge: round2(totals.sum_charge_amount),
        refunded: round2(totals.sum_admin_refund_amount),
        net: round2(totals.sum_net_amount),
        tips: round2(totals.sum_tip_amount),
      },
      flagged: rows.filter((r) => r.problems.length > 0).length,
    });
  } catch (error) {
    console.error('adminPaymentHistory error:', error.message);
    return Response.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
});