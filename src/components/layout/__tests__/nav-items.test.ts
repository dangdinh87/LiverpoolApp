import { describe, expect, it } from "vitest";
import { MATCH_PATHS, MORE_PATHS, SQUAD_PATHS, TABS, isActiveAny, isActivePath } from "../nav-items";

describe("isActivePath", () => {
  it("matches the home page only exactly", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/news", "/")).toBe(false);
  });

  it("matches a section and its children, not look-alike prefixes", () => {
    expect(isActivePath("/news", "/news")).toBe(true);
    expect(isActivePath("/news/bbc/some-story", "/news")).toBe(true);
    expect(isActivePath("/newsletter", "/news")).toBe(false);
  });
});

describe("bottom tabs", () => {
  const activeTab = (pathname: string) => TABS.find((tab) => isActiveAny(pathname, tab.paths))?.id;

  it("groups season, fixtures, standings and stats under Trận đấu", () => {
    for (const path of ["/season", "/fixtures", "/fixtures/560598", "/standings", "/stats"]) {
      expect(activeTab(path), path).toBe("matches");
    }
    expect(MATCH_PATHS).toContain("/season");
  });

  it("keeps player pages under Đội hình", () => {
    for (const path of ["/squad", "/players", "/player/12"]) {
      expect(activeTab(path), path).toBe("squad");
    }
    expect(SQUAD_PATHS.length).toBeGreaterThan(0);
  });

  it("marks exactly one tab per section and none on secondary pages", () => {
    expect(activeTab("/")).toBe("home");
    expect(activeTab("/news/guardian/story")).toBe("news");
    for (const path of ["/history", "/gallery", "/about", "/legal"]) {
      expect(activeTab(path), path).toBeUndefined();
      expect(isActiveAny(path, MORE_PATHS), path).toBe(true);
    }
  });

  it("links every tab to a real section root", () => {
    expect(TABS.map((tab) => tab.href)).toEqual(["/", "/fixtures", "/news", "/squad"]);
  });

});
