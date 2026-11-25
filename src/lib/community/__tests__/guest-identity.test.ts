import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieJar = new Map<string, string>();
const setCalls: Array<{ name: string; value: string; options?: Record<string, unknown> }> = [];

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [...cookieJar.entries()].map(([name, value]) => ({ name, value })),
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value !== undefined ? { name, value } : undefined;
    },
    set: (name: string, value: string, options?: Record<string, unknown>) => {
      setCalls.push({ name, value, options });
      if (options?.maxAge === 0) {
        cookieJar.delete(name);
      } else {
        cookieJar.set(name, value);
      }
    },
  })),
}));

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

import {
  DISPLAY_NAME_COOKIE,
  GUEST_TOKEN_COOKIE,
  deriveGuestUuid,
  ensureWritableActor,
  fallbackFanName,
  generateGuestToken,
  sanitizeDisplayName,
} from "../guest-identity";

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

beforeEach(() => {
  cookieJar.clear();
  setCalls.length = 0;
});

describe("guest identity helpers", () => {
  it("generates 64-char hex tokens and deterministic UUIDv4 actor IDs", async () => {
    const token = generateGuestToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);

    const idA = await deriveGuestUuid(token);
    const idB = await deriveGuestUuid(token);
    expect(idA).toBe(idB);
    expect(idA).toMatch(UUID_V4_RE);

    const other = await deriveGuestUuid(generateGuestToken());
    expect(other).not.toBe(idA);
  });

  it("sanitizes display names and rejects HTML, short, or reserved names", () => {
    expect(sanitizeDisplayName("  @Kopite  VN  ")).toBe("Kopite VN");
    expect(sanitizeDisplayName("<b>Scouser</b>")).toBe("bScouser/b");
    expect(sanitizeDisplayName("A")).toBeNull();
    expect(sanitizeDisplayName("Admin")).toBeNull();
    expect(sanitizeDisplayName("Anfield Daily")).toBeNull();
    expect(sanitizeDisplayName(123)).toBeNull();

    const long = "Liverpool Supporter From Anfield Road";
    expect(sanitizeDisplayName(long)?.length).toBe(32);
    expect(sanitizeDisplayName("L".repeat(20))).toBeNull();
  });

  it("formats a compact public fallback fan label from actorId", () => {
    expect(fallbackFanName("9f31a2b4-1111-4222-8333-444455556666")).toBe("Fan 9F31");
  });

  it("expires ad_display_name and ignores savedName when preferredName is cleared while preserving guest token", async () => {
    const first = await ensureWritableActor("Kopite Minh");
    expect(first.username).toBe("Kopite Minh");
    const token = cookieJar.get(GUEST_TOKEN_COOKIE);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(cookieJar.get(DISPLAY_NAME_COOKIE)).toBe(encodeURIComponent("Kopite Minh"));

    // Omitting preferredName keeps the saved display name cookie intact
    const preserved = await ensureWritableActor(undefined);
    expect(preserved.actorId).toBe(first.actorId);
    expect(preserved.username).toBe("Kopite Minh");

    // Passing empty or whitespace-only string deletes ad_display_name and returns Fan XXXX
    setCalls.length = 0;
    const cleared = await ensureWritableActor("   ");
    expect(cleared.actorId).toBe(first.actorId);
    expect(cleared.username).toBe(fallbackFanName(first.actorId));
    expect(cookieJar.get(GUEST_TOKEN_COOKIE)).toBe(token);
    expect(cookieJar.has(DISPLAY_NAME_COOKIE)).toBe(false);
    expect(setCalls).toContainEqual(
      expect.objectContaining({
        name: DISPLAY_NAME_COOKIE,
        value: "",
        options: expect.objectContaining({ maxAge: 0 }),
      }),
    );
  });
});
