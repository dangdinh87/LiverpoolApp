import { describe, expect, it } from "vitest";
import { getSafeRedirect } from "@/lib/safe-redirect";

describe("getSafeRedirect", () => {
  it("keeps same-origin paths with query and hash", () => {
    expect(getSafeRedirect("/profile")).toBe("/profile");
    expect(getSafeRedirect("/news?lang=vi#top")).toBe("/news?lang=vi#top");
  });

  it("falls back to / for empty or relative input", () => {
    expect(getSafeRedirect(null)).toBe("/");
    expect(getSafeRedirect(undefined)).toBe("/");
    expect(getSafeRedirect("")).toBe("/");
    expect(getSafeRedirect("profile")).toBe("/");
  });

  it("rejects anything that would leave the origin", () => {
    for (const evil of [
      "//evil.com",
      "/\\evil.com",
      "/\\/evil.com",
      "https://evil.com",
      "/\t/evil.com",
      "/.//evil.com",
      "/a/..//evil.com",
      "javascript:alert(1)",
    ]) {
      expect(getSafeRedirect(evil), evil).toBe("/");
    }
  });
});
