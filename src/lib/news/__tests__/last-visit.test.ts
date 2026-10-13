import { afterEach, describe, expect, it, vi } from "vitest";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, String(value)),
    removeItem: (key) => void data.delete(key),
    clear: () => data.clear(),
    key: (i) => [...data.keys()][i] ?? null,
    get length() {
      return data.size;
    },
  };
}

const blockedStorage = (): Storage =>
  new Proxy({} as Storage, {
    get: () => () => {
      throw new Error("blocked");
    },
  });

/** A fresh page load: the module's in-memory copy is gone, the storages are whatever the browser kept. */
async function loadPage(local: Storage, session: Storage) {
  vi.resetModules();
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("sessionStorage", session);
  vi.stubGlobal("window", { setTimeout, clearTimeout, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.stubGlobal("document", { addEventListener: vi.fn(), removeEventListener: vi.fn(), visibilityState: "visible" });
  return import("../last-visit");
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("last visit to /news", () => {
  it("has no previous visit the first time, and records one when the reader leaves", async () => {
    const local = memoryStorage();
    const first = await loadPage(local, memoryStorage());
    expect(first.getNewsBaseline()).toBeNull();
    first.watchNewsVisit()(); // mount, then leave
    expect(Number(local.getItem("lfc-news-last-visit"))).toBeGreaterThan(0);

    // A new tab compares against that visit.
    const second = await loadPage(local, memoryStorage());
    expect(second.getNewsBaseline()).toBe(Number(local.getItem("lfc-news-last-visit")));
  });

  it("keeps the same baseline for the whole tab, even after the visit is recorded", async () => {
    const local = memoryStorage();
    const session = memoryStorage();
    local.setItem("lfc-news-last-visit", "1000");
    const page = await loadPage(local, session);
    expect(page.getNewsBaseline()).toBe(1000);
    page.watchNewsVisit()();
    expect(Number(local.getItem("lfc-news-last-visit"))).toBeGreaterThan(1000);

    // Reload in the same tab: the divider is still drawn from 1000.
    const reloaded = await loadPage(local, session);
    expect(reloaded.getNewsBaseline()).toBe(1000);
  });

  it("does not record the visit on mount, only after a delay", async () => {
    vi.useFakeTimers();
    const local = memoryStorage();
    local.setItem("lfc-news-last-visit", "1000");
    const page = await loadPage(local, memoryStorage());
    const stop = page.watchNewsVisit();
    expect(local.getItem("lfc-news-last-visit")).toBe("1000");
    vi.advanceTimersByTime(10_000);
    expect(Number(local.getItem("lfc-news-last-visit"))).toBeGreaterThan(1000);
    stop();
  });

  it("falls back to no divider when storage is blocked", async () => {
    const page = await loadPage(blockedStorage(), blockedStorage());
    expect(page.getNewsBaseline()).toBeNull();
    expect(() => page.watchNewsVisit()()).not.toThrow();
  });
});
