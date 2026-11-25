import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { escapeIlikePattern } from "@/lib/gallery/queries";

let mockUser: { id: string; email: string } | null = { id: "u1", email: "nguyendangdinh47@gmail.com" };
let throwOnSupabase = false;
let throwOnServiceWrite = false;
const mockCookieJar = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [...mockCookieJar.entries()].map(([name, value]) => ({ name, value })),
    get: (name: string) => {
      const value = mockCookieJar.get(name);
      return value !== undefined ? { name, value } : undefined;
    },
    set: (name: string, value: string) => {
      mockCookieJar.set(name, value);
    },
  })),
  headers: vi.fn(async () => new Headers({ "cf-connecting-ip": "203.0.113.10" })),
}));

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));
vi.mock("@/i18n/revalidate", () => ({ revalidateLocalizedPath: vi.fn() }));
vi.mock("@/lib/cron", () => ({ withCronAuth: (fn: unknown) => fn }));
vi.mock("@/lib/constants", async () => {
  const actual = await vi.importActual<typeof import("@/lib/constants")>("@/lib/constants");
  return {
    ...actual,
    isAdminEmail: (email?: string | null) => email === "nguyendangdinh47@gmail.com",
  };
});
vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: vi.fn(async () => {
    if (throwOnSupabase) {
      throw new Error("Supabase unavailable: skipping request while the connection breaker is open");
    }
    return {
      auth: {
        getUser: async () => ({ data: { user: mockUser } }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({ single: async () => ({ data: null, error: { message: "not found" } }) }),
          in: () => ({
            order: () => ({ limit: async () => ({ data: [], error: null }) }),
            eq: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
          }),
        }),
      }),
    };
  }),
}));
vi.mock("@/lib/gallery/queries", async () => {
  const actual = await vi.importActual<typeof import("@/lib/gallery/queries")>("@/lib/gallery/queries");
  return {
    ...actual,
    setSiteSetting: vi.fn(async () => {}),
    getSiteSetting: vi.fn(async () => "/assets/lfc/stadium/bg_5.jpg"),
    listGalleryImagesFromDB: vi.fn(async () => ({ images: [], total: 0 })),
  };
});
vi.mock("@/lib/news/sync", () => ({
  syncPipeline: vi.fn(async () => {
    throw new Error("FATAL_DB_CONNECTION_STRING_SECRET");
  }),
}));
vi.mock("@/lib/news/digest", () => ({
  getDigestDateKey: () => "2026-11-18",
  getSeoArticleFromDigest: () => null,
  generateDailyDigest: vi.fn(async () => {
    throw new Error("INTERNAL_UPSTREAM_VIETAPI_SECRET_ERROR");
  }),
  upsertDigestRecord: vi.fn(),
}));
vi.mock("@/lib/news/supabase-service", () => ({
  getServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
      }),
      upsert: async () => {
        if (throwOnSupabase || throwOnServiceWrite) throw new Error("SUPABASE_BREAKER_TRIPPED");
        return { error: null };
      },
    }),
  }),
}));
vi.mock("@/lib/football", () => ({
  getFixtures: vi.fn(async () => {
    throw new Error("RAW_UPSTREAM_FDO_TOKEN_ERROR");
  }),
  getFixtureById: vi.fn(async (id: number) =>
    id === 100
      ? {
          fixture: { id: 100, date: new Date(Date.now() + 86_400_000).toISOString(), status: { short: "NS" } },
        }
      : null,
  ),
  getFixtureLineups: vi.fn(async () => []),
  getFixtureEvents: vi.fn(async () => []),
}));

beforeEach(() => {
  mockUser = { id: "u1", email: "nguyendangdinh47@gmail.com" };
  throwOnSupabase = false;
  throwOnServiceWrite = false;
  mockCookieJar.clear();
  vi.stubEnv("VIETAPI_KEY", "test-vietapi-key");
});

describe("Gallery & Settings API input validation", () => {
  it("escapes SQL LIKE wildcards in gallery search", () => {
    expect(escapeIlikePattern("100% Salah_goal\\1")).toBe("100\\% Salah\\_goal\\\\1");
  });

  it("POST /api/gallery/homepage rejects malformed JSON and unsafe URLs", async () => {
    const { POST } = await import("../gallery/homepage/route");

    const badJson = new NextRequest("http://localhost/api/gallery/homepage", {
      method: "POST",
      body: "{broken-json",
    });
    expect((await POST(badJson)).status).toBe(400);

    const xssUrl = new NextRequest("http://localhost/api/gallery/homepage", {
      method: "POST",
      body: JSON.stringify({ cloudinaryUrl: "javascript:alert(1)" }),
    });
    expect((await POST(xssUrl)).status).toBe(400);

    const validPreset = new NextRequest("http://localhost/api/gallery/homepage", {
      method: "POST",
      body: JSON.stringify({ cloudinaryUrl: "/assets/lfc/stadium/bg_1.jpg" }),
    });
    expect((await POST(validPreset)).status).toBe(200);
  });

  it("POST /api/gallery/settings rejects invalid JSON and unsafe bg schemes; GET sets Cache-Control", async () => {
    const { GET, POST } = await import("../gallery/settings/route");

    const getRes = await GET();
    expect(getRes.status).toBe(200);
    expect(getRes.headers.get("Cache-Control")).toContain("max-age=60");

    const badScheme = new NextRequest("http://localhost/api/gallery/settings", {
      method: "POST",
      body: JSON.stringify({ bg: "javascript:void(0)" }),
    });
    expect((await POST(badScheme)).status).toBe(400);
  });

  it("GET /api/gallery rejects unknown category values", async () => {
    const { GET } = await import("../gallery/route");
    const req = new NextRequest("http://localhost/api/gallery?category=invalid_cat");
    expect((await GET(req)).status).toBe(400);
  });
});

describe("API 500 error redaction & edge resilience", () => {
  it("hides raw internal error messages on 500 in /api/news/sync, /api/news/digest/generate, and /api/site-articles/generate", async () => {
    const { GET: syncGet } = await import("../news/sync/route");
    const syncRes = await (syncGet as unknown as (r: NextRequest) => Promise<Response>)(
      new NextRequest("http://localhost/api/news/sync"),
    );
    expect(syncRes.status).toBe(500);
    expect(syncRes.headers.get("Cache-Control")).toBe("no-store");
    const syncBody = JSON.stringify(await syncRes.json());
    expect(syncBody).not.toContain("FATAL_DB_CONNECTION_STRING_SECRET");

    const { GET: digestGet } = await import("../news/digest/generate/route");
    const digestRes = await (digestGet as unknown as (r: NextRequest) => Promise<Response>)(
      new NextRequest("http://localhost/api/news/digest/generate"),
    );
    expect(digestRes.status).toBe(500);
    expect(JSON.stringify(await digestRes.json())).not.toContain("INTERNAL_UPSTREAM_VIETAPI_SECRET_ERROR");

    const { GET: siteArticlesGet } = await import("../site-articles/generate/route");
    const badFixtureRes = await (siteArticlesGet as unknown as (r: NextRequest) => Promise<Response>)(
      new NextRequest("http://localhost/api/site-articles/generate?fixture=abc"),
    );
    expect(badFixtureRes.status).toBe(400);

    const fatalSiteArticlesRes = await (siteArticlesGet as unknown as (r: NextRequest) => Promise<Response>)(
      new NextRequest("http://localhost/api/site-articles/generate"),
    );
    expect(fatalSiteArticlesRes.status).toBe(500);
    expect(JSON.stringify(await fatalSiteArticlesRes.json())).not.toContain("RAW_UPSTREAM_FDO_TOKEN_ERROR");
  });

  it("validates URLs and catches thrown Supabase breaker errors in /api/news/comments and /api/news/like", async () => {
    const { GET: commentsGet } = await import("../news/comments/route");
    const { GET: likeGet } = await import("../news/like/route");

    const unknownHost = new NextRequest("http://localhost/api/news/comments?url=https://evil.example.com/post");
    expect((await commentsGet(unknownHost)).status).toBe(400);
    expect((await likeGet(unknownHost)).status).toBe(400);

    throwOnSupabase = true;
    const validArticle = new NextRequest(
      "http://localhost/api/news/comments?url=https://www.bbc.com/sport/football/articles/c123",
    );
    const cRes = await commentsGet(validArticle);
    expect(cRes.status).toBe(500);
    expect(JSON.stringify(await cRes.json())).not.toContain("connection breaker");

    const lRes = await likeGet(validArticle);
    expect(lRes.status).toBe(500);
    expect(JSON.stringify(await lRes.json())).not.toContain("connection breaker");
  });
});

describe("Server Actions runtime input & exception hardening", () => {
  it("guards savePrediction and saveRatings against non-integer fixtureId, null ratings, and thrown DB errors", async () => {
    const { savePrediction, saveRatings } = await import("@/app/actions/predictions");

    expect(await savePrediction(Number.NaN, 2, 1)).toEqual({ ok: false, error: "invalid" });
    expect(await saveRatings(-5, { Salah: 8 })).toEqual({ ok: false, error: "invalid" });
    expect(await saveRatings(100, null as unknown as Record<string, number>)).toEqual({
      ok: false,
      error: "invalid",
    });

    throwOnSupabase = true;
    expect(await savePrediction(100, 2, 1)).toEqual({ ok: false, error: "unavailable" });
    expect(await saveRatings(100, { Salah: 8 })).toEqual({ ok: false, error: "unavailable" });

    throwOnSupabase = false;
    throwOnServiceWrite = true;
    expect(await savePrediction(100, 2, 1)).toEqual({ ok: false, error: "unavailable" });

    // Guests can submit predictions without signing in (cookie-backed actor),
    // while post-match player ratings still require sign-in.
    throwOnServiceWrite = false;
    mockUser = null;
    expect(await savePrediction(100, 2, 1, "Kopite")).toEqual({ ok: true });
    expect(mockCookieJar.has("ad_guest_token")).toBe(true);
    expect(await saveRatings(100, { Salah: 8 })).toEqual({ ok: false, error: "signIn" });
  });
});
