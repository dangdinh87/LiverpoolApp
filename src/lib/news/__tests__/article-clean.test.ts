import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as cheerio from "cheerio";
import { describe, expect, it, vi } from "vitest";
import { cleanArticleContent, cleanArticleHtml, cleanImageList, MAX_BODY_IMAGES } from "../article-clean";
import { looksLikeJunkContent } from "../content-quality";
import { extractFromHtml } from "../enrichers/article-extractor";
import { imageKey, isJunkImage, isJunkParagraph } from "../junk";
import type { ArticleContent } from "../types";

vi.mock("../supabase-service", () => ({ getServiceClient: () => ({}) }));

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", `${name}.html`), "utf8");
const imgSrcs = (html: string | undefined) => {
  const $ = cheerio.load(html ?? "", null, false);
  return $("img").toArray().map((el) => $(el).attr("src") ?? "");
};
const text = (html: string | undefined) => cheerio.load(html ?? "", null, false).root().text().replace(/\s+/g, " ");
const prose = (n: number) => `Liverpool played a very good game at Anfield this weekend and the manager said so afterwards (${n}). `.repeat(2);

describe("extractor output on real pages (Oct 2026 article QA)", () => {
  it("liverpoolfc.com: no share-bar icons, no repeat of the hero, prose intact", async () => {
    const { content } = (await extractFromHtml(fixture("lfc-guest-blog"), "https://www.liverpoolfc.com/news/not-many-people-can-say-they-recorded-music-video-anfield-3am"))!;
    expect(imgSrcs(content.htmlContent)).toEqual([]);
    expect(text(content.htmlContent)).not.toMatch(/\b(Facebook|Twitter|WhatsApp|LinkedIn|Telegram)\b/);
    expect(text(content.htmlContent)).toContain("Ever since I can remember");
    expect(content.paragraphs.length).toBeGreaterThan(8);
  });

  it("empireofthekop.com: the 'More Stories' rail and its pictures are gone, the stats table stays", async () => {
    const { content } = (await extractFromHtml(
      fixture("eotk-more-stories"),
      "https://www.empireofthekop.com/2026/10/04/liverpool-tracking-market-opportunity-closely-as-la-liga-star-struggles-for-minutes/",
    ))!;
    expect(text(content.htmlContent)).not.toMatch(/More Stories|Latest News/);
    expect(imgSrcs(content.htmlContent)).toHaveLength(2);
    expect(content.htmlContent).toContain("<table");
  });

  it("liverpoolecho.co.uk: hero not repeated, photo credits are not paragraphs, no 'view images' label", async () => {
    const { content } = (await extractFromHtml(
      fixture("echo-reach-captions"),
      "https://www.liverpoolecho.co.uk/sport/football/football-news/liverpool-56m-transfer-decision-make-34713605",
    ))!;
    const keys = imgSrcs(content.htmlContent).map(imageKey);
    expect(keys).not.toContain(imageKey(content.heroImage));
    expect(content.paragraphs.some((p) => /\(Image:/.test(p))).toBe(false);
    expect(text(content.htmlContent)).not.toMatch(/view \d+ images/i);
    expect(content.paragraphs[0]).toMatch(/^When Liverpool decided/);
  });

  it("liverpool.com: breadcrumb icon, topic list and the affiliate kit card are gone", async () => {
    const { content } = (await extractFromHtml(
      fixture("liverpoolcom-affiliate"),
      "https://www.liverpool.com/liverpool-fc-news/features/dominik-szoboszlai-gets-teammates-backing-34714092",
    ))!;
    const t = text(content.htmlContent);
    expect(t).not.toMatch(/affiliate|Get Liverpool's new|Liverpool FC News/);
    expect(imgSrcs(content.htmlContent).some((s) => /\.svg|preferred-source|Untitled/i.test(s))).toBe(false);
    expect(content.paragraphs.some((p) => /^\d{1,2}:\d{2}, \d{2} \w+ \d{4}$/.test(p))).toBe(false);
  });

  it("mirror.co.uk: the dateline is not the first paragraph", async () => {
    const { content } = (await extractFromHtml(
      fixture("mirror-timestamp"),
      "https://www.mirror.co.uk/sport/football/news/liverpool-fowler-owen-debate-gerrard-37732928",
    ))!;
    expect(content.paragraphs[0]).toMatch(/^Steven Gerrard/);
    expect(content.paragraphs.some((p) => /\d{2}:\d{2}, \d{2} Oct 2026/.test(p))).toBe(false);
  });
});

describe("extractor: headline and datelines", () => {
  const para = (s: string) => `<p>${s} ${"Liverpool played well at Anfield today and the manager praised the squad afterwards. ".repeat(3)}</p>`;
  it("drops the ' - ESPN' site tag from the headline and ESPN datelines / video teasers from the body", async () => {
    const html = `<!doctype html><html><head><title>Muñoz on Liverpool switch - ESPN</title>
      <meta property="og:title" content="Spain's Víctor Muñoz on Liverpool switch: Premier League more physical than LaLiga - ESPN"></head>
      <body><article><div class="article-body">
        <p>Alex KirklandOct 1, 2026, 08:22 AM ET</p>
        <p>Nicol believes Klopp is wrong for backing Wirtz's Liverpool performances (2:37)</p>
        ${para("Muñoz was the first arrival at Anfield under coach Andoni Iraola.")}
        ${para("The wide forward was part of the Spain squad that won the World Cup.")}
        ${para("He told ESPN the pace of the league surprised him in preseason.")}
      </div></article></body></html>`;
    const { content } = (await extractFromHtml(html, "https://www.espn.com/soccer/story/_/id/50076437/munoz-liverpool"))!;
    expect(content.title).toBe("Spain's Víctor Muñoz on Liverpool switch: Premier League more physical than LaLiga");
    expect(content.paragraphs.some((p) => /Oct 1, 2026|\(2:37\)/.test(p))).toBe(false);
    expect(text(content.htmlContent)).not.toMatch(/Oct 1, 2026|\(2:37\)/);
  });
});

describe("cleanArticleHtml: pictures", () => {
  it("drops icons, logos, avatars, badges, vector art, tiny images and promo banners", () => {
    const html = [
      `<p>${prose(1)}</p>`,
      `<img src="https://x.test/icon-facebook.webp" width="24" height="24">`,
      `<img src="https://x.test/assets/icons/liver-pool.svg" alt="Liverpool Icon">`,
      `<img src="https://x.test/google-preferred-source-badge-dark.png">`,
      `<img src="https://x.test/storage/avatar/abc.jpg" width="22">`,
      `<img src="https://x.test/static-assets/images/MOS+prompts/Membership.png">`,
      `<img src="https://x.test/pixel.gif" width="1" height="1">`,
      `<img src="https://x.test/photo-small.jpg" width="80" height="60">`,
      `<figure><img src="https://x.test/real-photo.jpg" width="1200" height="800" alt="Goal"><figcaption>Goal</figcaption></figure>`,
    ].join("");
    const out = cleanArticleHtml(html);
    expect(imgSrcs(out)).toEqual(["https://x.test/real-photo.jpg"]);
    expect(out).toContain("<figcaption>Goal</figcaption>");
  });

  it("drops the hero wherever it repeats and any later copy of a photo (resized or slot-prefixed)", () => {
    const html = [
      `<p>${prose(1)}</p><figure><img src="https://x.test/a/0_Hero-1.jpg"></figure>`,
      `<p>${prose(2)}</p><figure><img src="https://x.test/a/Other-photo.jpg"></figure>`,
      `<p>${prose(3)}</p><figure><img src="https://x.test/a/Other-photo-1200x800.jpg"></figure><figcaption>orphan</figcaption>`,
    ].join("");
    const out = cleanArticleHtml(html, { heroImage: "https://x.test/b/Hero-1.jpg" });
    expect(imgSrcs(out)).toEqual(["https://x.test/a/Other-photo.jpg"]);
    expect(out).not.toContain("<figure></figure>");
  });

  it("keeps at most ~1 photo per 2 text blocks and never more than the hard cap", () => {
    const photos = (n: number) => Array.from({ length: n }, (_, i) => `<figure><img src="https://x.test/p${i}.jpg"></figure>`).join("");
    const shortText = cleanArticleHtml(`<p>${prose(1)}</p><p>${prose(2)}</p>${photos(12)}`);
    expect(imgSrcs(shortText)).toHaveLength(3);
    const longText = cleanArticleHtml(Array.from({ length: 40 }, (_, i) => `<p>${prose(i)}</p>`).join("") + photos(20));
    expect(imgSrcs(longText)).toHaveLength(MAX_BODY_IMAGES);
  });

  it("leaves no empty figure, link or wrapper behind", () => {
    const out = cleanArticleHtml(`<p>${prose(1)}</p><div><a href="https://x.test/story"><img src="https://x.test/logo.png"></a></div><figure><img src="https://x.test/icon-x.png"><figcaption>cap</figcaption></figure>`);
    expect(out).toBe(`<p>${prose(1)}</p>`);
  });
});

describe("cleanArticleHtml: furniture", () => {
  it("removes nav, footer, buttons, forms, svg and share links, and the labels left behind", () => {
    const out = cleanArticleHtml(
      `<nav><ul><li><a href="/a">Home</a></li><li><a href="/b">Sport</a></li></ul></nav>` +
        `<p>${prose(1)}</p>` +
        `<div><a href="https://www.facebook.com/sharer/sharer.php?u=x"><img src="https://x.test/icon-facebook.webp">Facebook</a><a><img src="https://x.test/icon-email.webp"><span>Email</span></a></div>` +
        `<button>Copy link</button><form><input></form><svg><path/></svg><footer>© 2026</footer>`,
    );
    expect(out).toBe(`<p>${prose(1)}</p>`);
  });

  it("removes share bars / bylines / related rails by class, but never a wrapper that holds the prose", () => {
    const out = cleanArticleHtml(
      `<div class="ShareBar_sharebar-wrapper__x"><span>Share this</span></div>` +
        `<div class="share-article-container"><p>${prose(1)}</p><p>${prose(2)}</p></div>`,
    );
    expect(text(out)).not.toContain("Share this");
    expect(text(out)).toContain(prose(1).trim());
    expect(text(out)).toContain(prose(2).trim());
  });

  it("removes timestamps, credits, consent placeholders and nav strips but keeps real prose", () => {
    const out = cleanArticleHtml(
      [
        `<p>14:51, 04 Oct 2026</p>`,
        `<p>18:35, 30 Sep 2026Updated 16:04, 02 Oct 2026</p>`,
        `<p>Jarell Quansah takes part in a cold water recovery swim(Image: Eddie Keogh - The FA via Getty Images)</p>`,
        `<div><p>You have to accept cookies in order to view this content on our site.</p>Manage Settings <a href="https://youtube.com/watch?v=1">Watch on YouTube</a></div>`,
        `<p>Transfers home page | Men's summer grades | Women's grades</p>`,
        `<p>${prose(1)}</p>`,
        `<p>Slot confirmed the fee with a source close to the player (Source: Fabrizio Romano) and said nothing more.</p>`,
      ].join(""),
    );
    expect(out).toBe(`<p>${prose(1)}</p><p>Slot confirmed the fee with a source close to the player (Source: Fabrizio Romano) and said nothing more.</p>`);
  });

  it("does not delete a whole article because a wrapper's text contains 'Article continues below'", () => {
    const out = cleanArticleHtml(`<div><article><p>${prose(1)}</p><div><p><span>Article continues below</span></p></div><p>${prose(2)}</p></article></div>`);
    expect(text(out)).toContain(prose(1).trim());
    expect(text(out)).toContain(prose(2).trim());
    expect(text(out)).not.toContain("Article continues below");
  });

  it("removes a paragraph that is only links (related teasers) and lists made only of links", () => {
    const out = cleanArticleHtml(
      `<p>${prose(1)}</p>` +
        `<p><strong><a href="https://x.test/1">- Premier League dragged through the mud - Gary Neville</a><a href="https://x.test/2"> - Man City owners must sell - Jamie Carragher</a></strong></p>` +
        `<ul><li><span><a href="/t/1">Liverpool FC</a></span></li><li><span><a href="/t/2">Dominik Szoboszlai</a></span></li></ul>` +
        `<p>The report was first published by <a href="https://x.test/3">the Athletic</a>, who also spoke to the player's agent about the deal.</p>`,
    );
    expect(text(out)).not.toMatch(/Gary Neville|Carragher|Szoboszlai/);
    expect(text(out)).toContain("the Athletic");
  });

  it("removes a rail of linked pictures but keeps a single linked photo and a gallery of unlinked ones", () => {
    const card = (n: number) => `<div class="post"><a href="https://x.test/story-${n}"><figure><img src="https://x.test/story-${n}.jpg"></figure></a><div><a href="https://x.test/story-${n}">Headline ${n}</a></div></div>`;
    const rail = cleanArticleHtml(`<p>${prose(1)}</p><section><header>More stories</header>${card(1)}${card(2)}${card(3)}</section>`);
    expect(imgSrcs(rail)).toEqual([]);
    expect(text(rail)).not.toMatch(/Headline|More stories/);
    const single = cleanArticleHtml(`<p>${prose(1)}</p>${card(1)}`);
    expect(imgSrcs(single)).toEqual(["https://x.test/story-1.jpg"]);
    const zoomable = cleanArticleHtml(`<p>${prose(1)}</p><a href="https://x.test/big-1.jpg"><img src="https://x.test/s-1.jpg"></a><a href="https://x.test/big-2.jpg"><img src="https://x.test/s-2.jpg"></a>`);
    expect(imgSrcs(zoomable)).toHaveLength(2);
  });

  it("removes an affiliate card with its heading and picture, not the article around it", () => {
    const out = cleanArticleHtml(
      `<p>${prose(1)}</p>` +
        `<div><p>Get Liverpool's new home kit</p><div><p>This article contains affiliate links, we will receive a commission on any sales we generate from it. <a href="/affiliates">Learn more</a></p></div>` +
        `<div><p><img src="https://x.test/kit-card.jpg" alt="Content Image"></p></div><div><p>Liverpool FC have launched their new home kit for the season, inspired by an adidas strip.</p></div></div>` +
        `<p>${prose(2)}</p>`,
    );
    expect(text(out)).not.toMatch(/affiliate|Get Liverpool's new|kit for the season/);
    expect(imgSrcs(out)).toEqual([]);
    expect(text(out)).toContain(prose(1).trim());
    expect(text(out)).toContain(prose(2).trim());
  });

  it("does not drop a short article just because it mentions a commission", () => {
    const out = cleanArticleHtml(`<div><p>${prose(1)}</p><p>The agent will receive a commission on the deal, Sky reported.</p></div>`);
    expect(text(out)).toContain(prose(1).trim());
  });

  it("keeps a factbox aside but drops a short or link-heavy one", () => {
    const fact = `Key facts: ${"City were charged with 115 breaches of the rules between 2009 and 2018. ".repeat(3)}`;
    const out = cleanArticleHtml(
      `<p>${prose(1)}</p><aside><p>${fact}</p></aside><aside><p>Sign up to Football Daily for more</p></aside><aside><a href="/1">Story one headline here with a long title that goes on</a> <a href="/2">Story two headline here with another long title that goes on</a> <a href="/3">Story three headline with yet another very long title</a></aside>`,
    );
    expect(text(out)).toContain("Key facts");
    expect(text(out)).not.toMatch(/Sign up|Story one/);
  });

  it("keeps video placeholders, embeds, tables and sub-headings; keeps one-word h2", () => {
    const html = `<p>${prose(1)}</p><h2>Verdict</h2><div class="article-video-player" data-video-src="https://x.test/v.mp4"></div><table><tr><td>1</td><td>2</td></tr></table><iframe src="https://www.youtube.com/embed/abc"></iframe>`;
    const out = cleanArticleHtml(html);
    expect(out).toContain("<h2>Verdict</h2>");
    expect(out).toContain("article-video-player");
    expect(out).toContain("<table");
    expect(out).toContain("youtube.com/embed/abc");
  });

  it("is idempotent", () => {
    const html = `<nav>x</nav><p>${prose(1)}</p><figure><img src="https://x.test/a.jpg"><figcaption>c</figcaption></figure><p>14:51, 04 Oct 2026</p><p>${prose(2)}</p>`;
    const once = cleanArticleHtml(html);
    expect(cleanArticleHtml(once)).toBe(once);
  });
});

describe("cleanArticleContent / cleanImageList", () => {
  const base = (over: Partial<ArticleContent>): ArticleContent => ({
    title: "t", paragraphs: [], images: [], sourceUrl: "https://x.test/a", sourceName: "X", ...over,
  });

  it("drops paragraphs whose block was removed from the HTML (related teasers, timestamps, credits)", () => {
    const teaser = "- Premier League dragged through the mud by Man City case - Gary Neville - Man City owners must sell";
    const out = cleanArticleContent(
      base({
        heroImage: "https://x.test/hero.jpg",
        htmlContent: `<p>${prose(1)}</p><p><a href="https://x.test/1">${teaser.slice(0, 50)}</a><a href="https://x.test/2">${teaser.slice(50)}</a></p>`,
        paragraphs: [prose(1).trim(), teaser, "14:51, 04 Oct 2026", "Dominik Szoboszlai backed(Image: Getty Images)"],
        images: ["https://x.test/hero.jpg", "https://x.test/icon-share.png", "https://x.test/p1.jpg", "https://x.test/p1-800x600.jpg"],
      }),
    );
    expect(out.paragraphs).toEqual([prose(1).trim()]);
    expect(out.images).toEqual(["https://x.test/p1.jpg"]);
  });

  it("a photo the cleaner removed from the HTML (teaser rail) does not come back through the photo list", () => {
    const card = (n: number) => `<div><a href="https://x.test/story-${n}"><figure><img src="https://x.test/story-${n}.jpg"></figure></a><div><a href="https://x.test/story-${n}">Headline ${n}</a></div></div>`;
    const out = cleanArticleContent(
      base({
        htmlContent: `<p>${prose(1)}</p><figure><img src="https://x.test/real.jpg"></figure><section>${card(1)}${card(2)}</section>`,
        paragraphs: [prose(1).trim()],
        images: ["https://x.test/real.jpg", "https://x.test/story-1.jpg", "https://x.test/story-2.jpg"],
      }),
    );
    expect(out.images).toEqual(["https://x.test/real.jpg"]);
  });

  it("keeps the original paragraphs when filtering would leave none (thin sources carry only a description)", () => {
    const out = cleanArticleContent(base({ paragraphs: ["Short."] }));
    expect(out.paragraphs).toEqual(["Short."]);
  });

  it("htmlContent is dropped when nothing is left, so the reader falls back to the plain body", () => {
    expect(cleanArticleContent(base({ htmlContent: `<nav>Menu</nav><button>x</button>`, paragraphs: [prose(1)] })).htmlContent).toBeUndefined();
  });

  it("cleanImageList dedupes, removes the hero and furniture, and caps", () => {
    const many = Array.from({ length: 20 }, (_, i) => `https://x.test/p${i}.jpg`);
    expect(cleanImageList([...many, "https://x.test/logo.png"], "https://x.test/p0.jpg")).toHaveLength(MAX_BODY_IMAGES);
    expect(cleanImageList(undefined)).toEqual([]);
  });
});

describe("junk rules", () => {
  it.each([
    ["https://i.test/icon-facebook.webp", true],
    ["https://i.test/assets/icons/liver-pool.svg", true],
    ["https://i.test/google-preferred-source-badge-dark.png", true],
    ["https://i.test/static-assets/images/piano-prompts/Miguel+Image.png", true],
    ["https://a.espncdn.com/combiner/i?img=/i/columnists/espn_generic_m.jpg&h=80&w=80", true],
    ["data:image/gif;base64,R0lGOD", true],
    ["https://i2-prod.liverpoolecho.co.uk/article1.ece/ALTERNATES/s1200e/0_GettyImages-2297848334.jpg", false],
    ["https://cdn.empireofthekop.com/2026/10/Lamine-Camara-Monaco-Liverpool-Premier-League.jpg", false],
    ["https://x.test/anfield-banner-kop.jpg", false],
  ])("isJunkImage %s -> %s", (url, junk) => {
    expect(isJunkImage(url)).toBe(junk);
  });

  it("flags 'Icon' / 'Badge' alt text even on neutral URLs", () => {
    expect(isJunkImage("https://x.test/a.png", "Manchester Evening News Icon")).toBe(true);
    expect(isJunkImage("https://x.test/a.png", "Mohamed Salah celebrates")).toBe(false);
  });

  it.each([
    "14:51, 04 Oct 2026",
    "18:35, 30 Sep 2026Updated 16:04, 02 Oct 2026",
    "Published 5 hours ago",
    "Jarell Quansah takes part in a cold water recovery swim(Image: Eddie Keogh - The FA via Getty Images)",
    "Transfers home page | Men's summer grades | Women's grades",
    "Thank you for registering",
    "Please refresh the page or navigate to another page on the site to be automatically logged in",
    "Ensure our latest news and what's on headlines always appear in your Google search results",
    "Add Liverpool.com as a preferred source on Google",
    "Swipe for next article",
  ])("flags %s", (line) => {
    expect(isJunkParagraph(line)).toBe(true);
  });

  it.each([
    "Slot confirmed the fee with a source close to the player (Source: Fabrizio Romano) and said nothing more.",
    "The 19-year-old trained at 14:30 on Sunday before the squad travelled to Rijeka for the Nations League tie.",
    "Salah's preferred source of goals this season has been the right-hand side of the box.",
  ])("keeps real prose: %s", (line) => {
    expect(isJunkParagraph(line)).toBe(false);
  });

  it("imageKey looks past CDN transform segments", () => {
    const a = "https://staticcdn.anfieldwatch.co.uk/images/cf/2b796de5-78c2-4fca-9081-9b17b42913c6-1788341989/w=1920,h=1080,fit=contain,q=90";
    const b = "https://staticcdn.anfieldwatch.co.uk/images/cf/68e5e80f-9f89-4c1e-8508-a311a96bb6ae-1780318292/w=322,h=200";
    expect(imageKey(a)).not.toBe(imageKey(b));
    expect(imageKey(a)).toBe(imageKey(a.replace("w=1920", "w=640")));
  });
});

describe("looksLikeJunkContent (stored rows from older extractors)", () => {
  const row = (over: Partial<ArticleContent>): ArticleContent => ({
    title: "t", paragraphs: [], images: [], sourceUrl: "https://x.test/a", sourceName: "X", ...over,
  });

  it("a stored bot-check page is not content", () => {
    expect(
      looksLikeJunkContent(row({ title: "Article", htmlContent: "<h1>JavaScript is disabled</h1> In order to continue, we need to verify that you're not a robot. Enable JavaScript and then reload the page." })),
    ).toBe(true);
  });

  it("an extraction with no sentence, picture or video is not content", () => {
    expect(looksLikeJunkContent(row({ htmlContent: "<div></div>" }))).toBe(true);
  });

  it("thin text inside a page-sized blob of markup is a page shell", () => {
    const blob = `<div>${"<li><a href='/x'>Menu item</a></li>".repeat(400)}</div>`;
    expect(blob.length).toBeGreaterThan(10_000);
    expect(looksLikeJunkContent(row({ paragraphs: ["Thank you for registering. Please refresh the page to be logged in as a member."], htmlContent: blob }))).toBe(true);
  });

  it("real, short and video articles are kept", () => {
    expect(looksLikeJunkContent(row({ paragraphs: [prose(1), prose(2), prose(3)], htmlContent: `<p>${prose(1)}</p>` }))).toBe(false);
    expect(looksLikeJunkContent(row({ paragraphs: [prose(1)], htmlContent: `<p>${prose(1)}</p>` }))).toBe(false);
    expect(looksLikeJunkContent(row({ paragraphs: [], videoUrl: "https://x.test/v.mp4" }))).toBe(false);
    expect(looksLikeJunkContent(row({ htmlContent: `<div class="article-video-player" data-video-src="https://x.test/v.mp4"></div>` }))).toBe(false);
  });
});
