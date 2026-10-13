import { describe, expect, it } from "vitest";
import { clusterStories } from "@/lib/news/story-clusters";
// 250 real feed titles from match week (Liverpool v Man City, Oct 2026): word
// weights depend on the whole batch, so the clustering is tested on a real one.
import feed from "./fixtures/feed-titles-2026-10-12.json";
// The same week with excerpts, pulled from the live database on 13 Oct 2026.
import week from "./fixtures/feed-snippets-2026-10-13.json";

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

describe("clusterStories on a real feed with excerpts", () => {
  const weekClusters = clusterStories(week);
  const storyIn = (fragment: string) =>
    weekClusters.find((c) => [c.lead, ...c.related].some((a) => a.title.includes(fragment)));
  const sourcesOf = (fragment: string) =>
    [storyIn(fragment)?.lead, ...(storyIn(fragment)?.related ?? [])].map((a) => a?.source).sort();

  it("joins a reworded headline through the names in its excerpt", () => {
    // "chê" vs "chỉ trích", and one headline drops the first name: only the excerpts agree on the whole.
    const story = storyIn("Rooney chê Gravenberch");
    expect(story).toBeDefined();
    expect(storyIn("Wayne Rooney chỉ trích Ryan Gravenberch")).toBe(story);
    expect(sourcesOf("Rooney chê Gravenberch")).toEqual(["bongda", "bongda24h"]);
  });

  it("joins English rewordings of one story", () => {
    expect(sourcesOf("Andoni Iraola blasts ref for Ryan Gravenberch red")).toEqual(["mirror", "tia"]);
    expect(storyIn("Steven Gerrard reveals Howard Webb reaction")).toBe(storyIn("Steven Gerrard saw Howard Webb reaction"));
  });

  it("keeps two angles on one match apart, even from one outlet", () => {
    // Same outlet, same result, but one is about the doubts over City's finances and the other about tactics.
    expect(storyIn("Man City đánh bại Liverpool trong nỗi hoài nghi tột cùng")).not.toBe(storyIn("Man City đã hủy diệt Liverpool như thế nào"));
  });

  it("does not merge stories that only share a player or the fixture", () => {
    expect(storyIn("Anderson áp đảo Wirtz")).not.toBe(storyIn("Carragher khuyên Liverpool gạch tên Florian Wirtz"));
    expect(storyIn("Wayne Rooney chỉ trích Ryan Gravenberch")).not.toBe(storyIn("Carragher chỉ trích trọng tài và Wirtz"));
    expect(storyIn("Dominik Szoboszlai injury update")).not.toBe(storyIn("Liverpool injury latest: Alexander Isak"));
    expect(storyIn("Liverpool 0-3 Man City: Player Ratings")).not.toBe(storyIn("Why Man City fans have inflatable bananas"));
  });

  it("keeps every article, one language per story, one outlet per story unless it is a near-copy", () => {
    expect(weekClusters.reduce((sum, c) => sum + 1 + c.related.length, 0)).toBe(week.length);
    for (const c of weekClusters) {
      const members = [c.lead, ...c.related];
      expect(new Set(members.map((a) => a.language)).size).toBe(1);
      expect(new Set(members.map((a) => a.source)).size).toBe(members.length);
    }
  });
});

describe("clusterStories on small batches", () => {
  const at = (hour: number) => new Date(Date.UTC(2026, 9, 12, hour)).toISOString();
  const article = (n: number, title: string, source: string, hour: number, contentSnippet = "", language = "en") => ({
    link: `https://example.com/${n}`,
    title,
    source,
    language,
    pubDate: at(hour),
    contentSnippet,
  });
  // Unrelated filler so that no word looks rarer or commoner than it would in a real feed.
  const filler = Array.from({ length: 12 }, (_, i) => article(100 + i, `Unrelated headline number ${i} about topic${i} and subject${i}`, `s${i}`, 1));

  it("ignores tone marks, so outlets that write them differently still match", () => {
    const [lead, other] = [
      article(1, "Konaté chấn thương nặng trước trận Real Madrid", "bongda", 10, "", "vi"),
      article(2, "Konate chan thuong nang, lo tran Real Madrid", "24h", 9, "", "vi"),
    ];
    const [story] = clusterStories([lead, other, ...filler.map((a) => ({ ...a, language: "vi" }))]);
    expect(story.related.map((a) => a.link)).toEqual([other.link]);
  });

  it("treats Vietnamese synonyms as one word", () => {
    const a = article(1, "Slot chê Gakpo sau trận thua", "bongda", 10, "", "vi");
    const b = article(2, "Slot chỉ trích Gakpo sau trận thua", "24h", 9, "", "vi");
    const [story] = clusterStories([a, b, ...filler.map((f) => ({ ...f, language: "vi" }))]);
    expect(story.related).toHaveLength(1);
  });

  it("folds a near-copy from the same outlet into the story, but not another angle", () => {
    const first = article(1, "Isak scores twice as Liverpool beat Chelsea at Anfield", "echo", 8);
    const copy = article(2, "Isak scores twice as Liverpool beat Chelsea at Anfield - reaction", "echo", 10);
    const angle = article(3, "Isak interview: why Liverpool signed him and what the fans expect next", "echo", 12);
    const stories = clusterStories([first, copy, angle, ...filler]).filter((c) => [c.lead, ...c.related].some((a) => a.source === "echo"));
    const members = stories.map((c) => [c.lead.link, ...c.related.map((a) => a.link)].sort());
    expect(members).toContainEqual([first.link, copy.link].sort());
    expect(members).toContainEqual([angle.link]);
  });

  it("never joins stories more than two days apart or in different languages", () => {
    const a = article(1, "Konate faces Real Madrid ban after red card", "echo", 10);
    const old = { ...article(2, "Konate faces Real Madrid ban after red card", "bbc", 10), pubDate: new Date(Date.UTC(2026, 9, 9, 10)).toISOString() };
    const vi = article(3, "Konate faces Real Madrid ban after red card", "bongda", 10, "", "vi");
    const stories = clusterStories([a, old, vi, ...filler]);
    expect(stories.find((c) => c.lead.link === a.link)?.related).toEqual([]);
  });
});
