import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  Link: () => null,
  usePathname: () => "/news",
  useRouter: () => ({}),
}));

import * as newsActions from "@/app/actions/news";
import { resolveEffectiveLang } from "@/components/news/news-feed";
import { isEmbeddableImageUrl } from "@/components/news/news-text";
import { findFplMatch, type FplPlayerStats } from "@/lib/football/fpl-stats";
import { fdoFetch } from "@/lib/football/fdo-client";

describe("phase 2 security & logic regressions", () => {
  it("exposes only loadMoreNews from the public news server-actions module", () => {
    expect(Object.keys(newsActions)).toEqual(["loadMoreNews"]);
  });

  it("falls back to 'all' on /vi/news when no Vietnamese feed articles exist", () => {
    expect(resolveEffectiveLang("vi", ["all", "en"])).toBe("all");
    expect(resolveEffectiveLang("vi", ["all", "vi", "en"])).toBe("vi");
    expect(resolveEffectiveLang("en", ["all", "en"])).toBe("en");
  });

  it("rejects CORP-blocked staticcdn.anfieldwatch.co.uk thumbnails while keeping valid HTTPS hosts", () => {
    expect(
      isEmbeddableImageUrl("https://staticcdn.anfieldwatch.co.uk/images/cf/abc/w=1600")
    ).toBe(false);
    expect(
      isEmbeddableImageUrl("https://ichef.bbci.co.uk/ace/standard/976/cpsprodpb/123.jpg")
    ).toBe(true);
    expect(isEmbeddableImageUrl("javascript:alert(1)")).toBe(false);
  });

  it("matches compound FPL surnames like 'Ramses Becker' to local 'Alisson Becker'", () => {
    const fplList: FplPlayerStats[] = [
      {
        fplId: 1,
        webName: "Alisson",
        firstName: "Alisson",
        secondName: "Ramses Becker",
        elementType: 1,
        minutes: 2520,
        starts: 28,
        goalsScored: 0,
        assists: 1,
        cleanSheets: 12,
        goalsConceded: 18,
        ownGoals: 0,
        penaltiesSaved: 1,
        penaltiesMissed: 0,
        yellowCards: 1,
        redCards: 0,
        saves: 74,
        bonus: 10,
        bps: 540,
        influence: 610.2,
        creativity: 12.4,
        threat: 0,
        expectedGoals: 0,
        expectedAssists: 0.42,
        expectedGoalInvolvements: 0.42,
        expectedGoalsConceded: 21.3,
        totalPoints: 134,
        pointsPerGame: 4.8,
        selectedByPercent: 18.2,
        form: 6.5,
      },
    ];
    expect(findFplMatch("Alisson Becker", fplList)?.fplId).toBe(1);
  });

  it("retries transient HTTP 429 responses and deduplicates concurrent in-flight FDO requests", async () => {
    const prevKey = process.env.FOOTBALL_DATA_ORG_KEY;
    process.env.FOOTBALL_DATA_ORG_KEY = "test-key";
    const originalFetch = globalThis.fetch;
    let calls = 0;

    globalThis.fetch = vi.fn(async () => {
      calls++;
      if (calls === 1) {
        return new Response("Too Many Requests", {
          status: 429,
          headers: { "x-requestcounter-reset": "1" },
        });
      }
      return new Response(JSON.stringify({ ok: true, calls }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    try {
      const [r1, r2] = await Promise.all([
        fdoFetch<{ ok: boolean; calls: number }>("/competitions/PL/standings", 3600),
        fdoFetch<{ ok: boolean; calls: number }>("/competitions/PL/standings", 3600),
      ]);
      expect(r1).toEqual({ ok: true, calls: 2 });
      expect(r2).toEqual({ ok: true, calls: 2 });
      expect(calls).toBe(2); // 1st call -> 429, 2nd call -> 200, shared across both callers
    } finally {
      globalThis.fetch = originalFetch;
      if (prevKey === undefined) delete process.env.FOOTBALL_DATA_ORG_KEY;
      else process.env.FOOTBALL_DATA_ORG_KEY = prevKey;
    }
  });
});
