import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { validatePassword } from "../../shared/passwordPolicy.ts";

// In-memory rate limiter for auth endpoints. Resets on deploy/restart —
// sufficient to slow automated brute-force and email-bombing attacks.
const WINDOW_MS = 10 * 60 * 1000; // 10-minute sliding window
const ACTION_LIMITS: Record<string, number> = {
  login: 10,            // 10 failed logins per 10 min per IP
  register: 5,          // 5 registrations per 10 min per IP
  "reset-request": 3,   // 3 reset requests per 10 min per IP (prevents email bombing)
  "resend-otp": 3,      // 3 OTP resends per 10 min per IP (prevents email bombing)
  "reset-password": 10, // 10 reset attempts per 10 min per IP
};
const _limits: Map<string, { count: number; firstAttempt: number }> = new Map();

function checkRateLimit(action: string, ip: string): { allowed: boolean; retryAfterMs: number } {
  const limit = ACTION_LIMITS[action] ?? 5;
  const key = `${action}:${ip}`;
  const now = Date.now();
  let entry = _limits.get(key);
  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    entry = { count: 0, firstAttempt: now };
    _limits.set(key, entry);
  }
  console.log("rateLimit check:", { key, count: entry.count, limit, mapSize: _limits.size });
  if (entry.count >= limit) {
    return { allowed: false, retryAfterMs: WINDOW_MS - (now - entry.firstAttempt) };
  }
  entry.count++;
  return { allowed: true, retryAfterMs: 0 };
}

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function extractError(err: any): string {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.detail ||
    err?.response?.data?.error ||
    err?.data?.detail ||
    err?.data?.message ||
    err?.message ||
    "Request failed."
  );
}

function extractStatus(err: any): number {
  return err?.response?.status || err?.status || 500;
}

export default async function (req: Request): Promise<Response> {
  let body: any = {};
  try {
    body = await req.json();
    const { action, email, password, resetToken, newPassword, turnstileToken } = body;

    if (!action) {
      return Response.json({ error: "Action is required." }, { status: 400 });
    }

    const ip = getClientIp(req);

    // --- Rate limit check ---
    const rateLimit = checkRateLimit(action, ip);
    if (!rateLimit.allowed) {
      const retryAfterMin = Math.ceil(rateLimit.retryAfterMs / 60000);
      return Response.json(
        { error: `Too many attempts. Please try again in ${retryAfterMin} minute${retryAfterMin > 1 ? "s" : ""}.` },
        { status: 429 }
      );
    }

    // --- Password strength validation (server-side, not bypassable) ---
    if (action === "register" && password) {
      const check = validatePassword(password);
      if (!check.valid) {
        return Response.json({ error: check.error }, { status: 400 });
      }
    }
    if (action === "reset-password" && newPassword) {
      const check = validatePassword(newPassword);
      if (!check.valid) {
        return Response.json({ error: check.error }, { status: 400 });
      }
    }

    // Use the SDK client — it knows the correct API base URL.
    const base44 = createClientFromRequest(req);

    let result: Record<string, unknown>;

    switch (action) {
      case "register": {
        const payload: Record<string, unknown> = { email, password };
        if (turnstileToken) payload.turnstile_token = turnstileToken;
        result = await base44.auth.register(payload);
        break;
      }
      case "login": {
        const loginResult = await base44.auth.loginViaEmailPassword(email, password, turnstileToken);
        // Return the access_token so the frontend can call setToken on its
        // own client (the backend function's client is short-lived).
        result = { access_token: loginResult.access_token, user: loginResult.user };
        break;
      }
      case "reset-request": {
        result = await base44.auth.resetPasswordRequest(email);
        break;
      }
      case "reset-password": {
        result = await base44.auth.resetPassword({ resetToken, newPassword });
        break;
      }
      case "resend-otp": {
        result = await base44.auth.resendOtp(email);
        break;
      }
      default:
        return Response.json({ error: "Invalid action." }, { status: 400 });
    }

    return Response.json(result, { status: 200 });
  } catch (error) {
    const message = extractError(error);
    const status = extractStatus(error);
    console.log("secureAuth error:", { action: body?.action, status, message });
    return Response.json({ error: message }, { status });
  }
}