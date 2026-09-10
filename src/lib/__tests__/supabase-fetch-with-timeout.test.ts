import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createSupabaseFetch,
  isSupabaseBreakerOpen,
  resetSupabaseBreaker,
} from "@/lib/supabase-fetch-with-timeout";

const originalFetch = globalThis.fetch;

describe("createSupabaseFetch", () => {
  beforeEach(() => resetSupabaseBreaker());
  afterEach(() => {
    globalThis.fetch = originalFetch;
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

  it("treats a 52x origin error as an outage", async () => {
    globalThis.fetch = vi.fn(async () => new Response("", { status: 522 })) as typeof fetch;
    const res = await createSupabaseFetch()("https://example.test");
    expect(res.status).toBe(522);
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
});
