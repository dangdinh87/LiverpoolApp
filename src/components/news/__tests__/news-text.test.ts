import { describe, expect, it } from "vitest";
import {
  assessReadability,
  cleanSnippet,
  cleanTitle,
  decodeEntities,
  filterJunk,
  formatNewsDate,
  interleave,
  isHttpUrl,
  isJunkParagraph,
  prepareArticleHtml,
} from "../news-text";

describe("decodeEntities / cleanTitle", () => {
  it("decodes named, decimal and hex entities", () => {
    expect(decodeEntities("Salah&#8217;s &amp; Gakpo&#x27;s &quot;goal&quot;")).toBe("Salah’s & Gakpo's \"goal\"");
  });
  it("decodes double-encoded entities", () => {
    expect(decodeEntities("A &amp;#8217; B")).toBe("A ’ B");
  });
  it("leaves unknown entities and bad code points alone", () => {
    expect(decodeEntities("&bogus; &#99999999;")).toBe("&bogus; &#99999999;");
  });
  it("cleanTitle strips tags and collapses whitespace", () => {
    expect(cleanTitle("  Reds <b>win</b>\n  &amp; go top ")).toBe("Reds win & go top");
  });
});

describe("cleanSnippet", () => {
  const title = "Liverpool beat Everton";
  it("drops feed boilerplate", () => {
    const s = "Liverpool secured a late winner at Goodison Park on Sunday. The post Liverpool beat Everton appeared first on Anfield Watch.";
    expect(cleanSnippet(s)).toBe("Liverpool secured a late winner at Goodison Park on Sunday.");
  });
  it("returns null for thin or title-echo snippets", () => {
    expect(cleanSnippet("Short")).toBeNull();
    expect(cleanSnippet("Liverpool beat Everton at Goodison Park again tonight", title)).toBeNull();
    expect(cleanSnippet(null)).toBeNull();
  });
  it("strips markup", () => {
    expect(cleanSnippet("<p>Arne Slot praised the team&#8217;s resilience after a hard-fought derby win.</p>")).toBe(
      "Arne Slot praised the team’s resilience after a hard-fought derby win.",
    );
  });
});

describe("formatNewsDate", () => {
  const now = Date.parse("2026-10-05T12:00:00Z");
  it("is relative inside three days and deterministic", () => {
    expect(formatNewsDate("2026-10-05T11:30:00Z", "vi", now)).toBe("30 phút trước");
    expect(formatNewsDate("2026-10-05T09:00:00Z", "en", now)).toBe("3h ago");
    expect(formatNewsDate("2026-10-03T12:00:00Z", "en", now)).toBe("2d ago");
  });
  it("uses the Vietnam-time day for older items and survives bad input", () => {
    // 2026-09-30T18:00Z is already 1 Oct in Vietnam (UTC+7)
    expect(formatNewsDate("2026-09-30T18:00:00Z", "en", now)).toBe("1 Oct");
    expect(formatNewsDate("nope", "en", now)).toBe("");
    expect(formatNewsDate("", "en", now)).toBe("");
  });
});

describe("junk filter", () => {
  it.each([
    "Article continues below",
    "Sign up for our free newsletter today",
    "FOLLOW OUR FACEBOOK PAGE for more",
    "By Jamie Jackson",
    "Photo: Getty Images",
    "Read more: Slot reveals the plan",
    "We use cookies to improve your experience on this site.",
    "Đọc thêm: Liverpool chốt tương lai Salah",
    "Nguồn: Sky Sports",
    "© 2026 The Guardian",
    "Advertisement",
    "View 2 Images",
    "ok",
  ])("flags %s", (line) => {
    expect(isJunkParagraph(line)).toBe(true);
  });

  it.each([
    "Liverpool will sign up a new centre-back before the window closes, according to reports in Spain.",
    "By the end of the first half Liverpool had already created six clear chances against the home side.",
    "Slot said the team had shown real character, and that the cookies in the dressing room were gone by full time.",
    "Salah ghi bàn ở phút 90+2 giúp Liverpool giành chiến thắng trước Everton.",
  ])("keeps real prose: %s", (line) => {
    expect(isJunkParagraph(line)).toBe(false);
  });

  it("filterJunk keeps order", () => {
    expect(filterJunk(["Advertisement", "A real sentence about Liverpool winning the match."])).toEqual([
      "A real sentence about Liverpool winning the match.",
    ]);
  });
});

describe("assessReadability", () => {
  const long = "Liverpool dominated possession and created chance after chance in a thrilling second half at Anfield. ".repeat(6);
  it("full / thin / linkout", () => {
    expect(assessReadability({ paragraphs: [long] })).toBe("full");
    expect(assessReadability({ paragraphs: [long], flaggedThin: true })).toBe("thin");
    expect(assessReadability({ paragraphs: ["A medium paragraph about the Liverpool game last night, nothing more than that."] })).toBe("linkout");
    expect(assessReadability({ paragraphs: [] })).toBe("linkout");
    expect(assessReadability({ paragraphs: [], hasVideo: true })).toBe("thin");
  });
  it("ignores junk when measuring", () => {
    expect(assessReadability({ paragraphs: ["Article continues below", "Sign up for our newsletter today", long] })).toBe("full");
  });
});

describe("prepareArticleHtml", () => {
  it("keeps only http(s) hrefs and opens them safely", () => {
    const out = prepareArticleHtml(
      '<p>See <a href="javascript:alert(1)">bad</a> and <a href="https://x.test/a?b=1" target="_self">good</a> link in this long enough line.</p>',
    );
    expect(out).not.toContain("javascript:");
    expect(out).toContain('href="https://x.test/a?b=1" target="_blank" rel="noopener noreferrer nofollow"');
    expect(out).not.toContain("_self");
  });
  it("strips scripts and inline handlers", () => {
    const out = prepareArticleHtml('<p onclick="x()">Hello Liverpool fans, welcome back to Anfield.</p><script>alert(1)</script>');
    expect(out).not.toContain("script");
    expect(out).not.toContain("onclick");
  });
  it("hardens images", () => {
    const out = prepareArticleHtml('<figure><img src="https://i.test/a.jpg" alt="a" loading="eager"></figure>');
    expect(out).toContain('loading="lazy"');
    expect(out).toContain('referrerpolicy="no-referrer"');
    expect(out).not.toContain("eager");
  });
  it("keeps video iframes in a box and drops other iframes", () => {
    const yt = prepareArticleHtml('<iframe src="https://www.youtube.com/embed/abc" width="560"></iframe>');
    expect(yt).toContain('class="article-embed"');
    expect(yt).toContain("youtube.com/embed/abc");
    expect(prepareArticleHtml('<iframe src="https://evil.test/x"></iframe>')).toBe("");
    expect(prepareArticleHtml('<iframe src="http://www.youtube.com/embed/abc"></iframe>')).toBe("");
  });
  it("drops junk paragraphs but keeps media paragraphs and prose", () => {
    const out = prepareArticleHtml(
      "<p>Article continues below</p><p>Liverpool won the derby with a late goal at Anfield.</p><p><img src='https://i.test/a.jpg'></p>",
    );
    expect(out).not.toContain("continues");
    expect(out).toContain("Liverpool won the derby");
    expect(out).toContain("<img");
  });
  it("leaves video placeholders untouched", () => {
    const html = '<div class="article-video-player" data-video-src="https://v.test/a.m3u8" data-poster="https://v.test/p.jpg"></div>';
    expect(prepareArticleHtml(html)).toBe(html);
  });
});

describe("isHttpUrl / interleave", () => {
  it("accepts http(s) only", () => {
    expect(isHttpUrl("https://a.test")).toBe(true);
    expect(isHttpUrl("http://a.test")).toBe(true);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("//a.test")).toBe(false);
    expect(isHttpUrl(undefined)).toBe(false);
  });
  it("places an image after every N paragraphs and the rest at the end", () => {
    const out = interleave(["a", "b", "c", "d", "e"], ["i1", "i2", "i3"], 2);
    expect(out.map((x) => x.value)).toEqual(["a", "b", "i1", "c", "d", "i2", "e", "i3"]);
  });
});

import { dropHeroDuplicate, imageKey } from "../news-text";

describe("imageKey / dropHeroDuplicate", () => {
  it("treats resized or slot-prefixed copies as the same photo", () => {
    expect(imageKey("https://i2-prod.x.co.uk/a/0_GettyImages-2298110147.jpg?w=615")).toBe(imageKey("https://i2-prod.x.co.uk/b/GettyImages-2298110147-1200x800.jpg"));
    expect(imageKey("https://x.test/one.jpg")).not.toBe(imageKey("https://x.test/two.jpg"));
  });
  it("removes the first body figure that repeats the hero, and only that", () => {
    const html = '<figure><img src="https://x.test/0_Hero-1.jpg"><figcaption>c</figcaption></figure><p>t</p><figure><img src="https://x.test/Other.jpg"></figure>';
    const out = dropHeroDuplicate(html, "https://x.test/Hero-1.jpg");
    expect(out).not.toContain("Hero-1");
    expect(out).toContain("Other.jpg");
    expect(dropHeroDuplicate(html, undefined)).toBe(html);
    expect(dropHeroDuplicate(html, "https://x.test/NotThere.jpg")).toBe(html);
  });
});

import { pickTitle } from "../news-text";

describe("pickTitle", () => {
  it("prefers the page's own headline", () => {
    expect(pickTitle("Salah&#8217;s double", "Feed headline")).toBe("Salah’s double");
  });
  it("falls back to the listing headline for placeholders and empties", () => {
    expect(pickTitle("Article", "Muñoz on Liverpool switch: PL more 'physical'")).toBe("Muñoz on Liverpool switch: PL more 'physical'");
    expect(pickTitle("Just a moment...", "Real headline")).toBe("Real headline");
    expect(pickTitle("", "Real headline")).toBe("Real headline");
    expect(pickTitle(undefined, undefined)).toBe("");
  });
  it("strips a trailing site tag, but not when that would leave a stub", () => {
    expect(pickTitle("Spain's Muñoz on Liverpool switch - ESPN", undefined, "ESPN")).toBe("Spain's Muñoz on Liverpool switch");
    expect(pickTitle("Slot out | Sky Sports", undefined, "Sky Sports")).toBe("Slot out | Sky Sports");
  });
  it("keeps the placeholder when there is nothing better", () => {
    expect(pickTitle("Article", undefined)).toBe("Article");
  });
});
