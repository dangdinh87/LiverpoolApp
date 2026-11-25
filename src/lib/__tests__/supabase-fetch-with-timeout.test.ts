import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createSupabaseFetch,
  isSupabaseBreakerOpen,
  resetSupabaseBreaker,
} from "@/lib/supabase-fetch-with-timeout";

const originalFetch = globalThis.fetch;
const originalNextPhase = process.env.NEXT_PHASE;

describe("createSupabaseFetch", () => {
  beforeEach(() => resetSupabaseBreaker());
  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalNextPhase === undefined) delete process.env.NEXT_PHASE;
    else process.env.NEXT_PHASE = originalNextPhase;
    vi.restoreAllMocks();
  });

  it("passes a successful response straight through", async () => {
    globalThis.fetch = vi.fn(async () => new Response("ok", { status: 200 })) as typeof fetch;
    const res = await createSupabaseFetch()("https://example.test");
    expect(res.status).toBe(200);
    expect(isSupabaseBreakerOpen()).toBe(false);
  });

  it("aborts a request that outlives the timeout", async () => {
    // Never resolves on its own; only the abort signal can end it.
    globalThis.fetch = vi.fn(
      (_input, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "TimeoutError")),
          );
        }),
    ) as typeof fetch;

    await expect(createSupabaseFetch(20)("https://example.test")).rejects.toThrow();
  });

  it("opens the breaker after a transport failure and short-circuits the next call", async () => {
    const spy = vi.fn(async () => {
      throw new TypeError("network down");
    });
    globalThis.fetch = spy as unknown as typeof fetch;
    const doFetch = createSupabaseFetch(50);

    await expect(doFetch("https://example.test")).rejects.toThrow("network down");
    expect(isSupabaseBreakerOpen()).toBe(true);

    // Second call must not reach the network at all.
    await expect(doFetch("https://example.test")).rejects.toThrow(/breaker is open/);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("surfaces every give-up as an AbortError so postgrest-js does not retry it", async () => {
    // postgrest-js retries with 1s/2s/4s backoff unless error.name === "AbortError".
    globalThis.fetch = vi.fn(
      (_input, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("timed out", "TimeoutError")),
          );
        }),
    ) as typeof fetch;
    const doFetch = createSupabaseFetch(20);

    await expect(doFetch("https://example.test")).rejects.toMatchObject({ name: "AbortError" });
    // Breaker is now open: the short-circuit must be an AbortError too.
    await expect(doFetch("https://example.test")).rejects.toMatchObject({ name: "AbortError" });

    resetSupabaseBreaker();
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    await expect(doFetch("https://example.test")).rejects.toMatchObject({ name: "AbortError" });
  });

  it("treats a 52x origin error as an outage", async () => {
    globalThis.fetch = vi.fn(async () => new Response("", { status: 522 })) as typeof fetch;
    const res = await createSupabaseFetch()("https://example.test");
    expect(res.status).toBe(522);
    expect(isSupabaseBreakerOpen()).toBe(true);
  });

  it("treats 502/503/504 gateway errors as an outage instead of closing an open breaker", async () => {
    for (const status of [502, 503, 504]) {
      resetSupabaseBreaker();
      globalThis.fetch = vi.fn(
        async () => new Response('{"message":"upstream request timeout"}', { status }),
      ) as typeof fetch;
      const res = await createSupabaseFetch()("https://example.test");
      expect(res.status).toBe(status);
      expect(isSupabaseBreakerOpen()).toBe(true);
    }
  });

  it("enforces timeout and trips breaker even when a fetch wrapper drops init.signal", async () => {
    // Next.js patch-fetch drops `signal` when revalidating stale cache entries.
    globalThis.fetch = vi.fn(
      () => new Promise<Response>(() => {}),
    ) as unknown as typeof fetch;

    const doFetch = createSupabaseFetch(25);
    await expect(doFetch("https://example.test")).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(isSupabaseBreakerOpen()).toBe(true);
  });

  it("closes the breaker once the origin answers again", async () => {
    let fail = true;
    globalThis.fetch = vi.fn(async () =>
      fail ? new Response("", { status: 522 }) : new Response("ok", { status: 200 }),
    ) as typeof fetch;

    const doFetch = createSupabaseFetch(50, 0); // zero cooldown so the retry proceeds
    await doFetch("https://example.test");
    fail = false;
    await doFetch("https://example.test");
    expect(isSupabaseBreakerOpen()).toBe(false);
  });

  it("does not blame Supabase when the caller aborts", async () => {
    const controller = new AbortController();
    globalThis.fetch = vi.fn(
      (_input, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    ) as typeof fetch;

    const pending = createSupabaseFetch(5_000)("https://example.test", {
      signal: controller.signal,
    });
    controller.abort();
    await expect(pending).rejects.toThrow();
    expect(isSupabaseBreakerOpen()).toBe(false);
  });

  it("does not trip the breaker after a single transient failure during production build", async () => {
    process.env.NEXT_PHASE = "phase-production-build";
    let attempt = 0;
    globalThis.fetch = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) throw new TypeError("transient build blip");
      return new Response("ok", { status: 200 });
    }) as typeof fetch;

    const doFetch = createSupabaseFetch();
    await expect(doFetch("https://example.test")).rejects.toThrow("transient build blip");
    expect(isSupabaseBreakerOpen()).toBe(false);

    const res = await doFetch("https://example.test");
    expect(res.status).toBe(200);
    expect(isSupabaseBreakerOpen()).toBe(false);
  });
});
