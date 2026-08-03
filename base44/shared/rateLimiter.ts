// In-memory rate limiter for brute-force protection on sensitive endpoints
// (e.g., invite-code linking). Tracks attempts per IP, per user account, and
// per target code. Resets on deploy/restart — sufficient to slow automated
// attacks to a crawl while admins are alerted via logged attempts.

const WINDOW_MS = 10 * 60 * 1000; // 10-minute sliding window
const MAX_ATTEMPTS = 5; // max 5 attempts per window per IP and per user
const CODE_LOCK_THRESHOLD = 10; // lock an invite code after 10 failed attempts
const MAX_BACKOFF_MS = 5 * 60 * 1000; // cap exponential backoff at 5 minutes

type Attempt = { timestamp: number; count: number; backoffMs: number };
type CodeAttempts = { fails: number; locked: boolean };

const ipAttempts = new Map<string, Attempt>();
const userAttempts = new Map<string, Attempt>();
const codeFails = new Map<string, CodeAttempts>();

function getOrCreate(map: Map<string, Attempt>, key: string): Attempt {
  let entry = map.get(key);
  if (!entry) {
    entry = { timestamp: Date.now(), count: 0, backoffMs: 0 };
    map.set(key, entry);
  }
  return entry;
}

function pruneExpired(map: Map<string, Attempt>) {
  const now = Date.now();
  for (const [key, entry] of map) {
    if (now - entry.timestamp > WINDOW_MS) map.delete(key);
  }
}

// Extract the client IP from request headers (Base44 proxies set x-forwarded-for).
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

// Returns { allowed, retryAfterMs }. When not allowed, retryAfterMs tells the
// caller how long to wait before the next attempt.
export function checkRateLimit(ip: string, userId: string): { allowed: boolean; retryAfterMs: number } {
  pruneExpired(ipAttempts);
  pruneExpired(userAttempts);

  const ipEntry = getOrCreate(ipAttempts, ip);
  const userEntry = getOrCreate(userAttempts, userId);
  const now = Date.now();

  // Reset window if expired
  if (now - ipEntry.timestamp > WINDOW_MS) {
    ipEntry.timestamp = now;
    ipEntry.count = 0;
    ipEntry.backoffMs = 0;
  }
  if (now - userEntry.timestamp > WINDOW_MS) {
    userEntry.timestamp = now;
    userEntry.count = 0;
    userEntry.backoffMs = 0;
  }

  if (ipEntry.count >= MAX_ATTEMPTS || userEntry.count >= MAX_ATTEMPTS) {
    const backoff = Math.max(ipEntry.backoffMs, userEntry.backoffMs);
    return { allowed: false, retryAfterMs: backoff };
  }

  return { allowed: true, retryAfterMs: 0 };
}

// Record a failed attempt and apply exponential backoff (2^count seconds,
// capped at MAX_BACKOFF_MS).
export function recordFailedAttempt(ip: string, userId: string) {
  const ipEntry = getOrCreate(ipAttempts, ip);
  const userEntry = getOrCreate(userAttempts, userId);

  ipEntry.count++;
  userEntry.count++;

  ipEntry.backoffMs = Math.min(Math.pow(2, ipEntry.count) * 1000, MAX_BACKOFF_MS);
  userEntry.backoffMs = Math.min(Math.pow(2, userEntry.count) * 1000, MAX_BACKOFF_MS);
}

// Clear rate-limit state on success so a user who eventually gets the right
// code isn't penalized for earlier typos.
export function recordSuccess(ip: string, userId: string) {
  ipAttempts.delete(ip);
  userAttempts.delete(userId);
}

// Check whether a specific invite code has been locked due to too many failures.
export function isCodeLocked(code: string): boolean {
  return codeFails.get(code)?.locked ?? false;
}

// Record a failed attempt against a specific invite code. Returns the updated
// fail count and whether the code is now locked.
export function recordCodeFailure(code: string): { locked: boolean; failCount: number } {
  let entry = codeFails.get(code);
  if (!entry) {
    entry = { fails: 0, locked: false };
    codeFails.set(code, entry);
  }
  entry.fails++;
  if (entry.fails >= CODE_LOCK_THRESHOLD) {
    entry.locked = true;
  }
  return { locked: entry.locked, failCount: entry.fails };
}