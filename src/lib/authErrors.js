// Turns a failed call into a message that says what actually happened. The
// fallback passed in is always specific to the screen — never "Something went
// wrong".

export const NETWORK_MESSAGE = "Couldn't reach Blockwork. Check your connection and try again.";

export function apiError(err, fallback) {
  const data = err?.response?.data || err?.data;
  if (data?.error) return data.error;
  if (!err?.response && /network|failed to fetch|timeout|load failed/i.test(err?.message || "")) {
    return NETWORK_MESSAGE;
  }
  return fallback;
}

export function apiCode(err) {
  return (err?.response?.data || err?.data || {}).code || "";
}