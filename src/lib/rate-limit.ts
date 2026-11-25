import type { NextRequest } from "next/server";

const MAX_ENTRIES = 2_000;
const store = new Map<string, { count: number; resetAt: number }>();

/**
 * Lazy expiry sweep + bounded capacity (no module-scope setInterval: Cloudflare
 * Workers disallow timers at global evaluation time, and an uncapped Map could
 * grow unboundedly under rotated keys within a single window).
 */
function pruneStore(now: number): void {
  if (store.size < MAX_ENTRIES) return;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
  while (store.size >= MAX_ENTRIES) {
    const oldestKey = store.keys().next().value;
    if (oldestKey === undefined) break;
    store.delete(oldestKey);
  }
}

export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now > entry.resetAt) {
    pruneStore(now);
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(0, limit - 1) };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: Math.max(0, limit - entry.count) };
}

/**
 * Resolve caller IP safely behind Cloudflare Workers and reverse proxies.
 *
 * `cf-connecting-ip` is set authoritatively by Cloudflare's edge and cannot be
 * spoofed by clients, whereas `x-forwarded-for`'s first element is client-
 * controlled when a forged header is sent (`spoofed, real_ip`).
 */
export function getClientIP(req: Pick<NextRequest, "headers">): string {
  const cfIp = req.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const lastHop = hops.at(-1);
    if (lastHop) return lastHop;
  }

  return "unknown";
}

/** Test-only helper to reset in-memory counters between specs. */
export function resetRateLimitStore(): void {
  store.clear();
  streamLocks.clear();
}

const MAX_LOCK_ENTRIES = 2_000;
const streamLocks = new Map<string, number>();

/**
 * Acquire an exclusive in-flight stream lock per key with a bounded safety TTL.
 * Uses lazy pruning (no setInterval) so it stays Cloudflare Workers compatible.
 */
export function acquireStreamLock(key: string, ttlMs: number): boolean {
  const now = Date.now();
  const expiresAt = streamLocks.get(key);
  if (expiresAt !== undefined && now < expiresAt) {
    return false;
  }

  if (streamLocks.size >= MAX_LOCK_ENTRIES) {
    for (const [k, exp] of streamLocks) {
      if (now >= exp) streamLocks.delete(k);
    }
    while (streamLocks.size >= MAX_LOCK_ENTRIES) {
      const oldest = streamLocks.keys().next().value;
      if (oldest === undefined) break;
      streamLocks.delete(oldest);
    }
  }

  streamLocks.set(key, now + ttlMs);
  return true;
}

export function releaseStreamLock(key: string): void {
  streamLocks.delete(key);
}
