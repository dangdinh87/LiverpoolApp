import { describe, expect, it } from "vitest";
import { clusterStories } from "@/lib/news/story-clusters";
// 250 real feed titles from match week (Liverpool v Man City, Oct 2026): word
// weights depend on the whole batch, so the clustering is tested on a real one.
import feed from "./fixtures/feed-titles-2026-10-12.json";

const clusters = clusterStories(feed);
const storyOf = (fragment: string) => clusters.find((c) => [c.lead, ...c.related].some((a) => a.title.includes(fragment)));

describe("clusterStories on a real feed", () => {
  it("groups one story from several outlets", () => {
    const story = storyOf("Liverpool dealt blow for Man City clash with Dominik Szoboszlai injury");
    expect([story?.lead, ...(story?.related ?? [])].map((a) => a?.source).sort()).toEqual(["independent", "liverpoolcom", "tia"]);
    const bananas = storyOf("Why Man City fans have inflatable bananas");
    expect(bananas).toBeDefined();
    expect(storyOf("Why do Man City fans carry inflatable bananas")).toBe(bananas);
  });

  it("keeps different stories apart even when they share names", () => {
    expect(storyOf("Andoni Iraola sends message to Liverpool fans")).not.toBe(storyOf("Jamie Carragher sends message to Andoni Iraola"));
    expect(storyOf("Carragher chỉ trích trọng tài")).not.toBe(storyOf("Man City bị chỉ trích dữ dội"));
  });

  it("keeps every article, never mixes languages and takes one piece per outlet", () => {
    expect(clusters.reduce((sum, c) => sum + 1 + c.related.length, 0)).toBe(feed.length);
    for (const c of clusters) {
      const members = [c.lead, ...c.related];
      expect(new Set(members.map((a) => a.language)).size).toBe(1);
      expect(new Set(members.map((a) => a.source)).size).toBe(members.length);
    }
  });
});
