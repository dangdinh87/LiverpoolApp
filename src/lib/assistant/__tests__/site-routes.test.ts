import { describe, expect, it } from "vitest";
import { normalizeAssistantPath, validateAssistantPath } from "../site-routes";

describe("assistant site-routes validation", () => {
  it("normalizes locale prefixes, origins, query strings, and trailing slashes", () => {
    expect(normalizeAssistantPath("/vi/fixtures/")).toBe("/fixtures");
    expect(normalizeAssistantPath("/en/standings?tab=ucl")).toBe("/standings");
    expect(normalizeAssistantPath("https://anfielddaily.com/vi/news/digest")).toBe("/news/digest");
    expect(normalizeAssistantPath("/vi")).toBe("/");
  });

  it("validates static routes with localized labels", () => {
    expect(validateAssistantPath("/vi/standings", "vi")).toEqual({
      ok: true,
      path: "/standings",
      label: "Bảng xếp hạng",
    });
    expect(validateAssistantPath("/fixtures", "en")).toEqual({
      ok: true,
      path: "/fixtures",
      label: "Fixtures & Results",
    });
    expect(validateAssistantPath("/chat", "vi").ok).toBe(false);
  });

  it("validates dynamic player slugs against real squad data and rejects unknown slugs", () => {
    const validPlayer = validateAssistantPath("/player/virgil-van-dijk", "vi");
    expect(validPlayer).toMatchObject({ ok: true, path: "/player/virgil-van-dijk" });

    const invalidPlayer = validateAssistantPath("/player/non-existent-player", "en");
    expect(invalidPlayer.ok).toBe(false);
  });

  it("validates dynamic fixture, analysis, and digest routes while blocking unknown paths", () => {
    expect(validateAssistantPath("/fixtures/123456", "en")).toEqual({
      ok: true,
      path: "/fixtures/123456",
      label: "Match Centre #123456",
    });
    expect(validateAssistantPath("/analysis/liverpool-vs-arsenal-review", "vi")).toEqual({
      ok: true,
      path: "/analysis/liverpool-vs-arsenal-review",
      label: "Bài phân tích trận đấu",
    });
    expect(validateAssistantPath("/news/digest/2026-11-25", "vi")).toEqual({
      ok: true,
      path: "/news/digest/2026-11-25",
      label: "Bản tin 2026-11-25",
    });

    expect(validateAssistantPath("/thanh-toan", "vi").ok).toBe(false);
    expect(validateAssistantPath("/admin/secrets", "en").ok).toBe(false);
  });
});
