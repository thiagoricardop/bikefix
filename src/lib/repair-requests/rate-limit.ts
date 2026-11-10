import { createHmac } from "node:crypto";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const MAX_TRACKED_CLIENTS = 5000;
const recentRequests = new Map<string, number[]>();

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export function hashClientIdentifier(identifier: string, secret = process.env.REPAIR_REQUEST_RATE_LIMIT_SECRET || "bikefix-local-rate-limit-only"): string {
  return createHmac("sha256", secret).update(identifier).digest("hex");
}

export function checkRepairRequestRateLimit(key: string, now = Date.now()): RateLimitResult {
  const recent = (recentRequests.get(key) ?? []).filter((timestamp) => now - timestamp < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    recentRequests.set(key, recent);
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((WINDOW_MS - (now - recent[0])) / 1000)) };
  }
  recent.push(now);
  recentRequests.set(key, recent);
  // Bound memory in long-running development/self-hosted processes.
  if (recentRequests.size > MAX_TRACKED_CLIENTS) {
    for (const [entryKey, timestamps] of recentRequests) {
      if (timestamps.every((timestamp) => now - timestamp >= WINDOW_MS)) recentRequests.delete(entryKey);
    }
    // A burst of unique/spoofed identifiers must not grow the in-process map
    // without bound. Evict oldest-inserted keys as an extra memory safeguard;
    // production still requires trusted edge rate limiting.
    while (recentRequests.size > MAX_TRACKED_CLIENTS) {
      const oldestKey = recentRequests.keys().next().value;
      if (oldestKey === undefined) break;
      recentRequests.delete(oldestKey);
    }
  }
  return { allowed: true };
}

export function resetRepairRequestRateLimitForTests(): void {
  recentRequests.clear();
}
