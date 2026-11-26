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

/**
 * Ceiling for a single Supabase HTTP round-trip.
 *
 * Healthy queries answer in well under a second, so this is already generous.
 * It is deliberately not larger: on a cold serverless instance the breaker
 * starts closed, so each *sequential* stage of a render pays this in full. At
 * 8s a page with two stages spent 15s before rendering, which overran the
 * platform's function limit and returned nothing at all.
 */
export const SUPABASE_FETCH_TIMEOUT_MS = 5_000;

/** Higher ceiling for cross-region CI static build workers (`next build`). */
export const SUPABASE_BUILD_FETCH_TIMEOUT_MS = 15_000;

/**
 * Ceiling for explicit user-initiated auth actions (sign-in, sign-up email
 * dispatch, OAuth/OTP callback verification, sign-out) where 5s is too tight.
 */
export const SUPABASE_AUTH_TIMEOUT_MS = 12_000;

/** How long to skip Supabase background reads after a connection-level failure. */
export const SUPABASE_BREAKER_COOLDOWN_MS = 8_000;

/** Short cooldown during static build so one transient burst does not poison ISR. */
export const SUPABASE_BUILD_BREAKER_COOLDOWN_MS = 2_000;

const BUILD_FAILURE_THRESHOLD = 3;

/**
 * Statuses that mean "the origin/gateway never answered" rather than "the
 * database answered with a query error". Cloudflare reports origin failures as
 * 52x; Supabase's Kong/Envoy gateway reports upstream timeouts/outages as
 * 502/503/504 (e.g. `{"message":"upstream request timeout"}`).
 */
function isOriginFailure(status: number): boolean {
  return (
    status === 502 ||
    status === 503 ||
    status === 504 ||
    (status >= 520 && status <= 530)
  );
}

/** Timestamp until which requests short-circuit; 0 means the breaker is closed. */
let breakerOpenUntil = 0;
let consecutiveFailures = 0;

/** Reset the breaker. Exported for tests. */
export function resetSupabaseBreaker(): void {
  breakerOpenUntil = 0;
  consecutiveFailures = 0;
}

/** Whether Supabase is currently being skipped. */
export function isSupabaseBreakerOpen(): boolean {
  return Date.now() < breakerOpenUntil;
}

function tripBreaker(cooldownMs: number): void {
  breakerOpenUntil = Date.now() + cooldownMs;
}

function recordFailure(isBuild: boolean, cooldownMs: number): void {
  consecutiveFailures += 1;
  if (!isBuild || consecutiveFailures >= BUILD_FAILURE_THRESHOLD) {
    tripBreaker(cooldownMs);
  }
}

/**
 * postgrest-js retries failed GETs up to 3 times with 1s/2s/4s backoff and
 * skips that only for errors named `AbortError`. A `TimeoutError`, a
 * transport `TypeError` or a plain `Error` from the open breaker were all
 * retried, so every Supabase step of a render cost timeout + 7s while the
 * database was down — the "~7s fixed cold cost" seen on `/` and `/gallery`.
 * Surfacing every give-up as an AbortError ends the request at once.
 */
function asAbortError(message: string): DOMException {
  return new DOMException(message, "AbortError");
}

/**
 * Build a `fetch` that aborts after `timeoutMs` and short-circuits while the
 * breaker is open.
 *
 * Any caller-supplied `signal` is honoured alongside the timeout, so React's
 * request cancellation still works.
 */
export function createSupabaseFetch(
  timeoutMs?: number,
  cooldownMs?: number,
  options?: { bypassBreaker?: boolean },
): typeof fetch {
  const bypassBreaker = Boolean(options?.bypassBreaker);
  return async (input, init) => {
    if (!bypassBreaker && isSupabaseBreakerOpen()) {
      throw asAbortError(
        "Supabase unavailable: skipping request while the connection breaker is open",
      );
    }

    const isBuild = process.env.NEXT_PHASE === "phase-production-build";
    const effectiveTimeoutMs =
      timeoutMs ?? (isBuild ? SUPABASE_BUILD_FETCH_TIMEOUT_MS : SUPABASE_FETCH_TIMEOUT_MS);
    const effectiveCooldownMs =
      cooldownMs ?? (isBuild ? SUPABASE_BUILD_BREAKER_COOLDOWN_MS : SUPABASE_BREAKER_COOLDOWN_MS);

    const callerSignal = init?.signal;
    if (callerSignal?.aborted) {
      throw callerSignal.reason ?? asAbortError("Aborted");
    }

    const controller = new AbortController();
    let timedOut = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let onCallerAbort: (() => void) | undefined;

    // Race a hard timer alongside AbortController: Next.js's patched `fetch`
    // strips `init.signal` when foreground-revalidating stale fetch-cache
    // entries (`signal: isStale ? undefined : signal`), which would otherwise
    // let `fetch()` hang for 60-90s during `next build` when Supabase is down.
    const abortOrTimeout = new Promise<never>((_resolve, reject) => {
      onCallerAbort = () => {
        const reason = callerSignal?.reason ?? asAbortError("Aborted");
        controller.abort(reason);
        reject(reason);
      };
      callerSignal?.addEventListener("abort", onCallerAbort, { once: true });

      timer = setTimeout(() => {
        timedOut = true;
        const err = new DOMException(
          "The operation was aborted due to timeout",
          "TimeoutError",
        );
        controller.abort(err);
        reject(err);
      }, effectiveTimeoutMs);
    });

    let response: Response;
    try {
      const fetchPromise = fetch(input, { ...init, signal: controller.signal });
      fetchPromise.catch(() => {});
      response = await Promise.race([fetchPromise, abortOrTimeout]);
    } catch (err) {
      // A caller aborting its own request says nothing about Supabase's health.
      if (callerSignal?.aborted && !timedOut) throw err;
      // Only a timeout or transport failure indicates the origin is down.
      if (!bypassBreaker) {
        recordFailure(isBuild, effectiveCooldownMs);
      }
      throw asAbortError(
        `Supabase request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      if (onCallerAbort) callerSignal?.removeEventListener("abort", onCallerAbort);
    }

    if (isOriginFailure(response.status)) {
      if (!bypassBreaker) {
        recordFailure(isBuild, effectiveCooldownMs);
      }
    } else {
      // A real answer proves the origin is back.
      resetSupabaseBreaker();
    }

    return response;
  };
}
