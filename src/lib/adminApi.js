import { base44 } from "@/api/base44Client";

// Invokes an admin backend function. Every admin action re-checks the admin
// role and the booking's real state on the server, so a refusal comes back as a
// message the admin needs to read — surface it verbatim rather than replacing it
// with a generic failure.
export async function adminInvoke(name, payload) {
  try {
    const res = await base44.functions.invoke(name, payload);
    if (res?.data?.error) throw new Error(res.data.error);
    return res.data;
  } catch (err) {
    throw new Error(
      err?.response?.data?.error ||
      err?.data?.error ||
      err?.message ||
      "That action could not be completed."
    );
  }
}

// Reason dropdowns. Kept here so every action's reason list stays consistent
// and the audit log stays filterable by a known set of codes.
const list = (pairs) => pairs.map(([value, label]) => ({ value, label }));

export const CANCEL_REASONS = list([
  ["neighbor_request", "Neighbor asked to cancel"],
  ["teen_unavailable", "Teen is no longer available"],
  ["schedule_conflict", "Scheduling couldn't be resolved"],
  ["safety_concern", "Safety concern raised"],
  ["duplicate_booking", "Duplicate or mistaken booking"],
  ["policy_violation", "Booking broke our rules"],
  ["other", "Other"],
]);

export const RESCHEDULE_REASONS = list([
  ["weather", "Weather"],
  ["neighbor_request", "Neighbor asked to move it"],
  ["teen_request", "Teen asked to move it"],
  ["safety_concern", "Safety concern"],
  ["support_correction", "Correcting a support error"],
  ["other", "Other"],
]);

export const ADDRESS_REASONS = list([
  ["address_correction", "Wrong address entered"],
  ["neighbor_moved", "Neighbor moved"],
  ["safety_concern", "Safety concern"],
  ["support_correction", "Correcting a support error"],
  ["other", "Other"],
]);

export const PRICE_REASONS = list([
  ["scope_reduced", "Job scope was smaller than agreed"],
  ["service_not_provided", "Part of the work wasn't done"],
  ["neighbor_request", "Neighbor asked for a lower price"],
  ["price_error", "Price was entered incorrectly"],
  ["goodwill", "Goodwill gesture"],
  ["other", "Other"],
]);

export const RESOLVE_REASONS = list([
  ["dispute_review", "Reviewed the dispute"],
  ["work_completed", "Work was completed"],
  ["work_not_completed", "Work was not completed"],
  ["no_show_teen", "Teen didn't show up"],
  ["no_show_neighbor", "Neighbor didn't show up"],
  ["other", "Other"],
]);

export const HOLD_REASONS = list([
  ["investigation", "Open investigation"],
  ["payment_dispute", "Payment dispute"],
  ["fraud_review", "Fraud review"],
  ["compliance_check", "Compliance check"],
  ["review_finished", "Review finished"],
  ["other", "Other"],
]);

export const NOTE_REASONS = list([
  ["support_note", "Support note"],
  ["investigation", "Investigation"],
  ["follow_up", "Follow-up needed"],
  ["other", "Other"],
]);

export const MESSAGE_REASONS = list([
  ["support_update", "Support update"],
  ["safety_guidance", "Safety guidance"],
  ["payment_clarification", "Payment clarification"],
  ["other", "Other"],
]);

export const RESEND_REASONS = list([
  ["missing_email", "Email never arrived"],
  ["email_bounced", "Email bounced"],
  ["user_request", "User asked for another copy"],
  ["other", "Other"],
]);

export const SUSPENSION_REASONS = list([
  ["safety_concern", "Safety concern"],
  ["under_investigation", "Open investigation"],
  ["fraud_review", "Fraud review"],
  ["policy_violation", "Broke our community rules"],
  ["minor_work_rules", "Work-hour or age rules breached"],
  ["account_takeover", "Suspected account takeover"],
  ["duplicate_account", "Duplicate account"],
  ["review_finished", "Review finished — safe to lift"],
  ["support_error", "Correcting a support error"],
  ["other", "Other"],
]);

export const UNLINK_REASONS = list([
  ["guardian_request", "Parent or guardian asked"],
  ["teen_request", "Teen asked to change their guardian"],
  ["not_the_guardian", "Couldn't confirm this person is the guardian"],
  ["abuse_report", "Report of abuse or neglect"],
  ["safety_concern", "Safety concern"],
  ["duplicate_link", "Duplicate or mistaken link"],
  ["review_finished", "Review is finished"],
  ["other", "Other"],
]);