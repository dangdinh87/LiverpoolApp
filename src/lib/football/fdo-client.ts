import "server-only";
import { getEnv } from "@/lib/env";

export const FDO_BASE = "https://api.football-data.org/v4";
export const FDO_LFC_ID = 64;
export const CANONICAL_LFC_ID = 40;

const DEFAULT_TIMEOUT_MS = 10_000;
const RUNTIME_MAX_429_RETRIES = 2;
const RUNTIME_MAX_RETRY_WAIT_MS = 12_000;
// During `next build`, 7 worker processes compete against FDO's 10 req/60s bucket.
// Honour the full `x-requestcounter-reset` window with wide jitter so the first
// worker populates `.next/cache/fetch-cache` and trailing workers read from disk.
const BUILD_MAX_429_RETRIES = 5;
const BUILD_MAX_RETRY_WAIT_MS = 65_000;

const inflight = new Map<string, Promise<unknown>>();

function isProductionBuild(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

export function mapFdoTeamId(fdoId: number): number {
  return fdoId === FDO_LFC_ID ? CANONICAL_LFC_ID : fdoId;
}

/**
 * Throw when an array is empty so `unstable_cache` refuses to pin transient
 * empty fallbacks caused by upstream 429/5xx errors.
 */
export async function requireNonEmptyArray<T>(promise: Promise<T[]>): Promise<T[]> {
  const rows = await promise;
  if (rows.length === 0) {
    throw new Error("[football] Empty upstream response — skip caching");
  }
  return rows;
}

function computeRetryDelayMs(res: Response, attempt: number, isBuild: boolean): number {
  if (process.env.VITEST) return 15;
  const maxWaitMs = isBuild ? BUILD_MAX_RETRY_WAIT_MS : RUNTIME_MAX_RETRY_WAIT_MS;
  const resetHeader = Number(res.headers.get("x-requestcounter-reset") ?? "");
  const jitter = isBuild
    ? 500 + Math.floor(Math.random() * 3500)
    : Math.floor(Math.random() * 400);
  if (Number.isFinite(resetHeader) && resetHeader > 0) {
    return Math.min(resetHeader * 1000 + jitter, maxWaitMs);
  }
  return Math.min(1500 * Math.pow(2, attempt) + jitter, maxWaitMs);
}

/**
 * Shared Football-Data.org v4 fetcher with:
 * 1. Per-isolate in-flight deduplication (collapses concurrent calls for the same path).
 * 2. Bounded HTTP 429 retry/backoff (absorbs `next build`'s multi-worker burst
 *    against FDO's 10 req/min free tier so workers read the populated fetch cache).
 */
export async function fdoFetch<T>(
  path: string,
  revalidate: number,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const key = getEnv("FOOTBALL_DATA_ORG_KEY");
  if (!key) throw new Error("[fdo] FOOTBALL_DATA_ORG_KEY not set");

  const dedupKey = `${revalidate}:${path}`;
  const existing = inflight.get(dedupKey) as Promise<T> | undefined;
  if (existing) return existing;

  const isBuild = isProductionBuild();
  const maxRetries = isBuild ? BUILD_MAX_429_RETRIES : RUNTIME_MAX_429_RETRIES;

  const task = (async (): Promise<T> => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const res = await fetch(`${FDO_BASE}${path}`, {
        headers: { "X-Auth-Token": key },
        next: { revalidate },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (res.ok) {
        return (await res.json()) as T;
      }

      if (res.status === 429 && attempt < maxRetries) {
        const waitMs = computeRetryDelayMs(res, attempt, isBuild);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      throw new Error(`[fdo] HTTP ${res.status} on ${path}`);
    }
    throw new Error(`[fdo] Exhausted retries on ${path}`);
  })();

  inflight.set(dedupKey, task);
  try {
    return await task;
  } finally {
    inflight.delete(dedupKey);
  }
}
