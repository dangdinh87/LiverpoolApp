import { describe, expect, it } from "vitest";
import {
  HERITAGE_PATHS,
  MATCH_PATHS,
  MORE_PATHS,
  NEWS_PATHS,
  SQUAD_PATHS,
  TABS,
  isActiveAny,
  isActivePath,
} from "../nav-items";

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

  it("groups season, fixtures, standings, stats and predictions under Matches", () => {
    for (const path of ["/season", "/fixtures", "/fixtures/560598", "/standings", "/stats", "/predictions"]) {
      expect(activeTab(path), path).toBe("matches");
      expect(isActiveAny(path, MATCH_PATHS), path).toBe(true);
    }
    expect(MATCH_PATHS).toContain("/season");
  });

  it("keeps player, injury and transfer pages under Squad", () => {
    for (const path of ["/squad", "/players", "/player/12", "/injuries", "/transfers"]) {
      expect(activeTab(path), path).toBe("squad");
      expect(isActiveAny(path, SQUAD_PATHS), path).toBe(true);
    }
    expect(SQUAD_PATHS.length).toBeGreaterThan(0);
  });

  it("groups editorial and heritage routes cleanly", () => {
    for (const path of ["/news", "/news/digest", "/analysis", "/analysis/arsenal-review"]) {
      expect(isActiveAny(path, NEWS_PATHS), path).toBe(true);
    }
    for (const path of ["/history", "/gallery", "/about"]) {
      expect(isActiveAny(path, HERITAGE_PATHS), path).toBe(true);
    }
  });

  it("marks exactly one tab per section and none on secondary pages", () => {
    expect(activeTab("/")).toBe("home");
    expect(activeTab("/news/guardian/story")).toBe("news");
    for (const path of ["/analysis", "/history", "/gallery", "/about", "/legal", "/profile", "/auth"]) {
      expect(activeTab(path), path).toBeUndefined();
      expect(isActiveAny(path, MORE_PATHS), path).toBe(true);
    }
  });

  it("links every tab to a real section root", () => {
    expect(TABS.map((tab) => tab.href)).toEqual(["/", "/fixtures", "/news", "/squad"]);
  });
});
