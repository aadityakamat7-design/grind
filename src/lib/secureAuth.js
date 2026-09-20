import { base44 } from "@/api/base44Client";

/**
 * Proxy auth calls through the secureAuth backend function for
 * server-side rate limiting and password strength validation.
 * Returns the auth result on success, throws Error with message on failure.
 */
export async function secureAuth(action, params = {}) {
  try {
    const res = await base44.functions.invoke("secureAuth", { action, ...params });
    return res.data;
  } catch (err) {
    const error =
      err?.response?.data?.error ||
      err?.data?.error ||
      err?.message ||
      "Request failed.";
    throw new Error(error);
  }
}