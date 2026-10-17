import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The sync route used to invalidate the rendered pages but not the data cache
 * behind them. `revalidatePath` only drops the HTML; the `unstable_cache`
 * entries tagged "news" kept their own TTL, so the re-render it triggered read
 * the previous snapshot and cached the *old* articles for another full window.
 * A fresh sync showed up minutes late, and the most expensive thing the site
 * does — a full page render — was spent on stale data.
 *
 * These tests pin the order-independent part of that fix: the tag is busted,
 * and only when something was actually inserted.
 */
let syncResult: { inserted: number; upserted: number; liveBlogsRefreshed?: string[] };

vi.mock("@/lib/news/sync", () => ({
  syncPipeline: vi.fn(async () => syncResult),
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/i18n/revalidate", () => ({ revalidateLocalizedPath: vi.fn() }));
vi.mock("@/lib/cron", () => ({ withCronAuth: (fn: unknown) => fn }));

import { revalidateTag } from "next/cache";
import { revalidateLocalizedPath } from "@/i18n/revalidate";
import { GET } from "../route";
import { getArticleUrl } from "@/lib/news-config";

const request = { nextUrl: { searchParams: new URLSearchParams() } };
const call = () => (GET as unknown as (r: unknown) => Promise<Response>)(request);

beforeEach(() => {
  vi.clearAllMocks();
  syncResult = { inserted: 2, upserted: 5 };
});

describe("GET /api/news/sync", () => {
  it("busts the news data cache, not just the rendered pages", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    // A cache profile is required as the second argument in Next 16.
    expect(revalidateTag).toHaveBeenCalledWith("news", "max");
    expect(revalidateLocalizedPath).toHaveBeenCalledWith("/");
    expect(revalidateLocalizedPath).toHaveBeenCalledWith("/news");
  });

  it("re-renders the page of each live blog whose headline moved on (pages are ISR'd for an hour)", async () => {
    const url = "https://www.liverpoolecho.co.uk/sport/football/football-news/brentford-liverpool-live-updates-32661234";
    syncResult = { inserted: 0, upserted: 3, liveBlogsRefreshed: [url] };
    await call();
    expect(revalidateLocalizedPath).toHaveBeenCalledWith(getArticleUrl(url));
  });

  it("invalidates nothing when the run only rewrote existing rows", async () => {
    // Almost every run updates rows (feeds re-send items, live blogs re-date);
    // re-rendering on that alone wrote ~3 ISR entries for every one read.
    syncResult = { inserted: 0, upserted: 40 };
    await call();
    expect(revalidateTag).not.toHaveBeenCalled();
    expect(revalidateLocalizedPath).not.toHaveBeenCalled();
  });

  it("invalidates nothing when the run inserted no articles", async () => {
    syncResult = { inserted: 0, upserted: 0 };
    const res = await call();
    expect(res.status).toBe(200);
    expect(revalidateTag).not.toHaveBeenCalled();
    expect(revalidateLocalizedPath).not.toHaveBeenCalled();
  });
});
