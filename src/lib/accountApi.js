import { base44 } from "@/api/base44Client";

// Calls one of the account functions and turns the server's answer into
// something the screen can use: a thrown Error carrying `code` (and any extra
// detail like the blocker list or the Stripe name) so each card can react.
export async function callAccountFunction(name, payload = {}) {
  try {
    const res = await base44.functions.invoke(name, payload);
    return res.data;
  } catch (err) {
    const data = err?.response?.data || err?.data || {};
    const error = new Error(data.error || err?.message || "Something went wrong. Please try again.");
    error.code = data.code || "";
    error.status = err?.response?.status || err?.status || 0;
    error.blockers = data.blockers || null;
    error.stripeName = data.stripe_name || "";
    error.provider = data.provider || "";
    throw error;
  }
}

/** Loads everything the Account information screen shows for this account. */
export async function loadAccountInfo() {
  return callAccountFunction("getAccountInfo", {});
}

/** Saves one JSON file to the person's device. */
export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "blockwork-account.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}