// Core payout review agent logic. Runs 8 fraud/error/compliance checks on a
// booking payout before money moves. Shared by reviewPayout (single),
// reviewPayoutsBatch (batch), and reviewPayoutsAudit (retroactive).
//
// The agent ASSISTS admin review — it never auto-releases a flagged payout.
// Low risk + all checks pass may auto-approve; anything else holds for a human.
import { getVerifiedAge } from './teenAge.ts';
import { isEligibleForCategory } from './categoryAgeRules.ts';
import { getHourLimits } from './stateHourLimits.ts';
import { getStateTimezone, getLocalHour, isSchoolDayDateLocal, isSummerDateLocal } from './localTime.ts';
import { calculatePlatformFee, calculateNetAmount } from './platformFee.ts';

export const REVIEW_THRESHOLD = 100; // USD — payouts at/above this trigger review
const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;

export interface CheckResult {
  name: string;
  passed: boolean;
  reason?: string;
}

export interface PayoutReviewResult {
  risk_level: 'low' | 'medium' | 'high';
  recommended_action: 'auto_approve' | 'hold_for_admin' | 'reject';
  is_critical: boolean;
  checks: CheckResult[];
  flags: string[];
  is_first_payout: boolean;
  amount: number;
  net_amount: number;
  tip_amount: number;
}

// Checks whose failure is critical — block the payout entirely and alert admins.
const CRITICAL_CHECKS = ['amount_sanity', 'duplicate_detection', 'self_dealing', 'booking_legitimacy'];

// Checks a booking's scheduled time against state hour-limit windows (early/late/school).
// Does NOT re-check cumulative daily/weekly totals — those were enforced at booking creation.
function checkTimeWindow(state: string, age: number, scheduledStart: string, estimatedHours: number): string | null {
  if (age >= 18) return null;
  const tz = getStateTimezone(state);
  const limits = getHourLimits(state, age);
  if (!limits) return `State ${state} not supported for hour-limit verification`;
  const start = new Date(scheduledStart);
  const hrs = Number(estimatedHours) || 2;
  const end = new Date(start.getTime() + hrs * 3600000);
  const summer = isSummerDateLocal(start, tz);
  const schoolDay = isSchoolDayDateLocal(start, tz);
  const latestEnd = summer ? limits.latestEndHourSummer : limits.latestEndHour;
  const startHour = getLocalHour(start, tz);
  const endHour = getLocalHour(end, tz);
  const sameDay = end.getDate() === start.getDate() && end.getMonth() === start.getMonth();
  if (startHour < limits.earliestStartHour) {
    return `Work started before ${limits.earliestStartHour}:00 (state ${state} limit)`;
  }
  if (!sameDay || endHour > latestEnd) {
    return `Work continued past ${latestEnd}:00 (state ${state} limit for ${schoolDay ? 'school day' : 'non-school day'})`;
  }
  if (schoolDay && limits.prohibitedDuringSchoolHours && startHour < limits.schoolHoursEnd && endHour > limits.schoolHoursStart) {
    return `Work during school hours ${limits.schoolHoursStart}:00–${limits.schoolHoursEnd}:00 (state ${state})`;
  }
  return null;
}

// Runs all 8 checks on a booking and returns a structured review result.
export async function reviewBookingPayout(base44, booking: any): Promise<PayoutReviewResult> {
  const svc = base44.asServiceRole.entities;
  const checks: CheckResult[] = [];
  const flags: string[] = [];
  let isCritical = false;

  const baseAmount = Math.round((Number(booking.net_amount) || 0) * 100) / 100;
  const tipAmount = Math.round((Number(booking.tip_amount) || 0) * 100) / 100;
  const totalAmount = Math.round((baseAmount + tipAmount) * 100) / 100;
  const gross = Math.round((Number(booking.price_total) || 0) * 100) / 100;
  const expectedFee = calculatePlatformFee(gross);
  const expectedNet = calculateNetAmount(gross);

  // --- 1. Amount sanity ---
  const amountDiff = Math.abs(baseAmount - expectedNet);
  if (amountDiff > 0.02) {
    checks.push({ name: 'amount_sanity', passed: false, reason: `Net ${money(baseAmount)} ≠ expected ${money(expectedNet)} (gross ${money(gross)} − 12.9% + $0.30 fee ${money(expectedFee)})` });
    flags.push(`Amount mismatch: net ${money(baseAmount)} vs expected ${money(expectedNet)}`);
    isCritical = true;
  } else {
    checks.push({ name: 'amount_sanity', passed: true });
  }

  // --- 2. Destination correctness ---
  const isIndependent = !booking.parent_user_id;
  const destProfiles = isIndependent
    ? await svc.TeenProfile.filter({ user_id: booking.teen_user_id })
    : await svc.ParentProfile.filter({ user_id: booking.parent_user_id });
  const dest = destProfiles[0];
  if (!dest?.stripe_connect_account_id) {
    checks.push({ name: 'destination_correctness', passed: false, reason: `No Connect account for ${isIndependent ? 'teen' : 'parent'}` });
    flags.push('Recipient has no Connect account');
  } else {
    checks.push({ name: 'destination_correctness', passed: true });
  }

  // --- 3. Duplicate detection ---
  if (booking.stripe_transfer_id) {
    checks.push({ name: 'duplicate_detection', passed: false, reason: `Booking already has transfer ID ${booking.stripe_transfer_id}` });
    flags.push('Duplicate transfer: booking already has a transfer ID');
    isCritical = true;
  } else {
    checks.push({ name: 'duplicate_detection', passed: true });
  }

  // --- 4. Booking legitimacy ---
  const reachedInProgress = ['in_progress', 'completed'].includes(booking.status);
  const hasCharge = !!booking.stripe_payment_intent_id;
  if (!reachedInProgress) {
    checks.push({ name: 'booking_legitimacy', passed: false, reason: `Booking status is ${booking.status}, never reached in_progress` });
    flags.push(`Booking never reached in_progress (status: ${booking.status})`);
    isCritical = true;
  } else if (!hasCharge) {
    checks.push({ name: 'booking_legitimacy', passed: false, reason: 'No Stripe charge (payment_intent_id) on this booking' });
    flags.push('No valid charge — booking has no payment intent');
    isCritical = true;
  } else {
    checks.push({ name: 'booking_legitimacy', passed: true });
  }

  // --- 5. Self-dealing ---
  let selfDealing = false;
  if (booking.buyer_user_id === booking.teen_user_id) {
    selfDealing = true;
    flags.push('Self-dealing: buyer and teen are the same user');
  } else if (booking.parent_user_id && booking.parent_user_id === booking.buyer_user_id) {
    selfDealing = true;
    flags.push('Self-dealing: parent and buyer are the same user');
  } else {
    const links = await svc.ParentTeenLink.filter({ parent_user_id: booking.buyer_user_id, teen_user_id: booking.teen_user_id });
    if (links.length > 0) {
      selfDealing = true;
      flags.push('Self-dealing: buyer is the parent/guardian of this teen');
    }
  }
  if (selfDealing) {
    checks.push({ name: 'self_dealing', passed: false, reason: 'Self-dealing detected' });
    isCritical = true;
  } else {
    checks.push({ name: 'self_dealing', passed: true });
  }

  // --- 6. Velocity anomalies ---
  const teenBookings = await svc.Booking.filter({ teen_user_id: booking.teen_user_id, status: 'completed' }, '-created_date', 100);
  const velocityFlags: string[] = [];
  const last24h = teenBookings.filter((b) => b.teen_finished_at && new Date(b.teen_finished_at) > new Date(Date.now() - 86400000));
  if (last24h.length >= 5) velocityFlags.push(`${last24h.length} jobs completed in 24h`);
  const buyerCounts: Record<string, number> = {};
  for (const b of teenBookings) buyerCounts[b.buyer_user_id] = (buyerCounts[b.buyer_user_id] || 0) + 1;
  const thisBuyerCount = buyerCounts[booking.buyer_user_id] || 0;
  if (thisBuyerCount >= 3) velocityFlags.push(`${thisBuyerCount} bookings from same buyer`);
  if (totalAmount > 0 && teenBookings.length > 1) {
    const avgPast = teenBookings.reduce((s, b) => s + (Number(b.net_amount) || 0), 0) / teenBookings.length;
    if (totalAmount > avgPast * 5 && totalAmount > 50) velocityFlags.push(`Amount ${money(totalAmount)} is 5×+ teen average ${money(avgPast)}`);
  }
  if (velocityFlags.length > 0) {
    checks.push({ name: 'velocity_anomalies', passed: false, reason: velocityFlags.join('; ') });
    flags.push(...velocityFlags.map((f) => `Velocity: ${f}`));
  } else {
    checks.push({ name: 'velocity_anomalies', passed: true });
  }

  // --- 7. Compliance ---
  const teenPrivate = await svc.TeenPrivateData.filter({ user_id: booking.teen_user_id });
  const privateData = teenPrivate[0];
  const teenProfiles = await svc.TeenProfile.filter({ user_id: booking.teen_user_id });
  const tp = teenProfiles[0];
  const age = getVerifiedAge(privateData);
  const state = tp?.state || null;
  const complianceFlags: string[] = [];
  if (age != null && state && booking.listing_id) {
    // Look up the listing to get the category
    const listings = await svc.Listing.filter({ id: booking.listing_id });
    const category = listings[0]?.category || '';
    if (category) {
      const eligible = isEligibleForCategory(age, state, category);
      if (!eligible.eligible) complianceFlags.push(`Age ${age} below minimum ${eligible.minAge} for ${category}`);
    }
  }
  if (booking.scheduled_start && age != null && age < 18 && state) {
    const timeIssue = checkTimeWindow(state, age, booking.scheduled_start, booking.estimated_hours || 2);
    if (timeIssue) complianceFlags.push(timeIssue);
  }
  if (complianceFlags.length > 0) {
    checks.push({ name: 'compliance', passed: false, reason: complianceFlags.join('; ') });
    flags.push(...complianceFlags.map((f) => `Compliance: ${f}`));
  } else {
    checks.push({ name: 'compliance', passed: true });
  }

  // --- 8. Account status ---
  if (!dest?.stripe_connect_account_id || dest.connect_status !== 'active') {
    checks.push({ name: 'account_status', passed: false, reason: `Connect account status: ${dest?.connect_status || 'not_setup'}` });
    flags.push(`Connect account not active (${dest?.connect_status || 'not_setup'})`);
  } else {
    const identityVerified = isIndependent
      ? tp?.identity_status === 'verified' || tp?.parent_identity_verified === true
      : dest?.is_identity_verified === true;
    if (!identityVerified) {
      checks.push({ name: 'account_status', passed: false, reason: 'Identity not verified' });
      flags.push('Identity not verified');
    } else {
      checks.push({ name: 'account_status', passed: true });
    }
  }

  // --- First payout detection ---
  const pastTransferred = await svc.Booking.filter({ teen_user_id: booking.teen_user_id, payout_status: 'transferred' });
  const isFirstPayout = pastTransferred.length === 0;

  // --- Risk level + recommended action ---
  const failedChecks = checks.filter((c) => !c.passed);
  const nonCriticalFailures = failedChecks.filter((c) => !CRITICAL_CHECKS.includes(c.name));
  let risk_level: 'low' | 'medium' | 'high' = 'low';
  let recommended_action: 'auto_approve' | 'hold_for_admin' | 'reject' = 'auto_approve';
  if (isCritical) {
    risk_level = 'high';
    recommended_action = 'reject';
  } else if (failedChecks.length > 0) {
    risk_level = nonCriticalFailures.length >= 2 ? 'high' : 'medium';
    recommended_action = 'hold_for_admin';
  }

  return {
    risk_level,
    recommended_action,
    is_critical: isCritical,
    checks,
    flags,
    is_first_payout: isFirstPayout,
    amount: totalAmount,
    net_amount: baseAmount,
    tip_amount: tipAmount,
  };
}

// Persists a review result as a PayoutReview record. Returns the created record.
export async function saveReview(base44, booking: any, result: PayoutReviewResult, opts: { auditMode?: boolean; status?: string } = {}) {
  const svc = base44.asServiceRole.entities;
  // Replace any existing non-terminal review for this booking so we don't pile up duplicates
  const existing = await svc.PayoutReview.filter({ booking_id: booking.id, status: 'pending' });
  for (const r of existing) {
    await svc.PayoutReview.delete(r.id);
  }
  return await svc.PayoutReview.create({
    booking_id: booking.id,
    teen_user_id: booking.teen_user_id || '',
    parent_user_id: booking.parent_user_id || '',
    buyer_user_id: booking.buyer_user_id || '',
    listing_title: booking.listing_title || '',
    amount: result.amount,
    net_amount: result.net_amount,
    tip_amount: result.tip_amount,
    is_first_payout: result.is_first_payout,
    risk_level: result.risk_level,
    recommended_action: result.recommended_action,
    is_critical: result.is_critical,
    checks: result.checks,
    flags: result.flags,
    status: opts.status || (result.recommended_action === 'auto_approve' ? 'auto_approved' : 'pending'),
    audit_mode: opts.auditMode || false,
  });
}