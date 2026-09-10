/**
 * Timeout-aware `fetch` with a shared circuit breaker, for Supabase clients.
 *
 * Supabase-js defaults to the platform `fetch`, which has no timeout. When the
 * database is unreachable or paused (free-tier projects auto-pause when idle),
 * the edge accepts the connection and then stalls — so every query hangs until
 * something upstream gives up, roughly 90 seconds later. That turns a degraded
 * database into unresponsive pages and a failing production build.
 *
 * Two layers guard against that:
 *
 *  1. Each request aborts after `SUPABASE_FETCH_TIMEOUT_MS`, converting an
 *     indefinite hang into a prompt rejection that callers already treat as
 *     "no data".
 *  2. Once a request fails that way, the breaker opens for a short cooldown and
 *     subsequent requests reject immediately. Without it, every page render
 *     during an outage pays the full timeout again, because failures are
 *     deliberately not cached.
 */

/** Ceiling for a single Supabase HTTP round-trip. */
export const SUPABASE_FETCH_TIMEOUT_MS = 8_000;

/** How long to skip Supabase entirely after a connection-level failure. */
export const SUPABASE_BREAKER_COOLDOWN_MS = 30_000;

/**
 * Statuses that mean "the origin never answered" rather than "the database
 * answered with an error". Cloudflare reports origin failures as 52x.
 */
function isOriginFailure(status: number): boolean {
  return status >= 520 && status <= 530;
}

/** Timestamp until which requests short-circuit; 0 means the breaker is closed. */
let breakerOpenUntil = 0;

/** Reset the breaker. Exported for tests. */
export function resetSupabaseBreaker(): void {
  breakerOpenUntil = 0;
}

/** Whether Supabase is currently being skipped. */
export function isSupabaseBreakerOpen(): boolean {
  return Date.now() < breakerOpenUntil;
}

function tripBreaker(cooldownMs: number): void {
  breakerOpenUntil = Date.now() + cooldownMs;
}

/**
 * Build a `fetch` that aborts after `timeoutMs` and short-circuits while the
 * breaker is open.
 *
 * Any caller-supplied `signal` is honoured alongside the timeout, so React's
 * request cancellation still works.
 */
export function createSupabaseFetch(
  timeoutMs: number = SUPABASE_FETCH_TIMEOUT_MS,
  cooldownMs: number = SUPABASE_BREAKER_COOLDOWN_MS,
): typeof fetch {
  return async (input, init) => {
    if (isSupabaseBreakerOpen()) {
      throw new Error(
        "Supabase unavailable: skipping request while the connection breaker is open",
      );
    }

    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = init?.signal
      ? AbortSignal.any([init.signal, timeout])
      : timeout;

    let response: Response;
    try {
      response = await fetch(input, { ...init, signal });
    } catch (err) {
      // Only a timeout or transport failure indicates the origin is down. A
      // caller aborting its own request says nothing about Supabase's health.
      if (!init?.signal?.aborted) tripBreaker(cooldownMs);
      throw err;
    }

    if (isOriginFailure(response.status)) {
      tripBreaker(cooldownMs);
    } else {
      // A real answer proves the origin is back.
      resetSupabaseBreaker();
    }

    return response;
  };
}
