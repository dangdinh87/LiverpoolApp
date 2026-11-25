import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimitStore } from "@/lib/rate-limit";

const cookieJar = new Map<string, string>();
let predictionRows: Array<{
  user_id: string;
  fixture_id: number;
  home_goals: number;
  away_goals: number;
  author_name?: string | null;
}> = [];
let simulateFkErrorOnPrimary = false;
let siteSettingsStore = new Map<string, unknown>();
let fixtureStatusShort = "NS";
let fixtureDateOffsetMs = 86_400_000;

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [...cookieJar.entries()].map(([name, value]) => ({ name, value })),
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value !== undefined ? { name, value } : undefined;
    },
    set: (name: string, value: string) => {
      cookieJar.set(name, value);
    },
  })),
  headers: vi.fn(async () => new Headers({ "cf-connecting-ip": "198.51.100.7" })),
}));

vi.mock("next/cache", () => ({
  updateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));

vi.mock("@/i18n/revalidate", () => ({
  revalidateLocalizedPath: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
  })),
}));

vi.mock("@/lib/football", () => ({
  getFixtures: vi.fn(async () => []),
  getFixtureById: vi.fn(async (id: number) =>
    id === 560999
      ? {
          fixture: {
            id: 560999,
            date: new Date(Date.now() + fixtureDateOffsetMs).toISOString(),
            status: { short: fixtureStatusShort },
          },
          teams: {
            home: { id: 40, name: "Liverpool FC", logo: "" },
            away: { id: 42, name: "Arsenal FC", logo: "" },
          },
          goals: { home: null, away: null },
        }
      : null,
  ),
  getFixtureEvents: vi.fn(async () => []),
  getFixtureLineups: vi.fn(async () => []),
}));

vi.mock("@/lib/news/supabase-service", () => ({
  getServiceClient: () => ({
    from: (table: string) => {
      if (table === "match_predictions") {
        return {
          select: () => ({
            eq: async (_col: string, fixtureId: number) => ({
              data: predictionRows.filter((r) => r.fixture_id === fixtureId),
              error: null,
            }),
          }),
          upsert: async (row: {
            user_id: string;
            fixture_id: number;
            home_goals: number;
            away_goals: number;
            author_name?: string | null;
          }) => {
            if (simulateFkErrorOnPrimary) {
              return { error: { code: "23503", message: "violates foreign key constraint" } };
            }
            predictionRows = [
              ...predictionRows.filter(
                (r) => !(r.user_id === row.user_id && r.fixture_id === row.fixture_id),
              ),
              row,
            ];
            return { error: null };
          },
        };
      }
      if (table === "site_settings") {
        return {
          select: () => ({
            eq: (_col: string, key: string) => ({
              maybeSingle: async () => ({
                data: siteSettingsStore.has(key) ? { value: siteSettingsStore.get(key) } : null,
                error: null,
              }),
            }),
          }),
          upsert: async (row: { key: string; value: unknown }) => {
            siteSettingsStore.set(row.key, row.value);
            return { error: null };
          },
        };
      }
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      };
    },
  }),
}));

beforeEach(() => {
  cookieJar.clear();
  predictionRows = [];
  siteSettingsStore = new Map();
  simulateFkErrorOnPrimary = false;
  fixtureStatusShort = "NS";
  fixtureDateOffsetMs = 86_400_000;
  resetRateLimitStore();
});

describe("login-free fan predictions", () => {
  it("lets a guest submit, read, and update a scoreline using a cookie-backed actor", async () => {
    const { getPredictionState, savePrediction } = await import("../predictions");

    const before = await getPredictionState(560999);
    expect(before).toMatchObject({
      available: true,
      signedIn: false,
      open: true,
      mine: null,
    });

    const res = await savePrediction(560999, 2, 1, "Anfield Guest");
    expect(res).toEqual({ ok: true });
    expect(cookieJar.has("ad_guest_token")).toBe(true);

    const after = await getPredictionState(560999);
    expect(after.mine).toEqual({ home: 2, away: 1 });
    expect(after.displayName).toBe("Anfield Guest");
    expect(after.community.count).toBe(1);
    expect(after.community.topScores[0]).toMatchObject({ home: 2, away: 1, share: 100 });

    // Updating overwrites the same actor's pick instead of double-counting
    await savePrediction(560999, 3, 1);
    const updated = await getPredictionState(560999);
    expect(updated.mine).toEqual({ home: 3, away: 1 });
    expect(updated.community.count).toBe(1);
  });

  it("falls back seamlessly to site_settings if FK constraint exists before migration 014", async () => {
    simulateFkErrorOnPrimary = true;
    const { getPredictionState, savePrediction } = await import("../predictions");

    const res = await savePrediction(560999, 1, 0, "Backup Kop");
    expect(res).toEqual({ ok: true });
    expect(siteSettingsStore.has("guest_predictions:560999")).toBe(true);

    const state = await getPredictionState(560999);
    expect(state.mine).toEqual({ home: 1, away: 0 });
    expect(state.community.count).toBe(1);
  });

  it("rejects predictions after kick-off", async () => {
    fixtureDateOffsetMs = -60_000;
    const { savePrediction } = await import("../predictions");
    expect(await savePrediction(560999, 2, 0)).toEqual({ ok: false, error: "closed" });
  });

  it("rejects offensive or gambling display names in predictions", async () => {
    const { savePrediction } = await import("../predictions");
    expect(await savePrediction(560999, 2, 0, "óc chó")).toEqual({ ok: false, error: "profanity" });
    expect(await savePrediction(560999, 2, 0, "kubet88")).toEqual({ ok: false, error: "profanity" });
  });
});
