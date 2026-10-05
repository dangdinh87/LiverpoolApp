import { describe, expect, it, vi } from "vitest";
import { extractFromHtml, isBotChallengePage, isNavigationLike, stripLeadingMetaLines } from "../article-extractor";
import * as cheerio from "cheerio";

vi.mock("../../supabase-service", () => ({ getServiceClient: () => ({}) }));

const page = (head: string, body: string) => `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;
const long = (s: string) => `${s} ${"Liverpool played well at Anfield today. ".repeat(2)}`;
const run = async (html: string, url: string) => (await extractFromHtml(html, url))!;

describe("BBC (hero caption lead, rich-text only)", () => {
  const html = page(
    `<meta property="og:title" content="Inside Liverpool's youth investment"><meta property="og:description" content="BBC Sport takes a closer look at youth recruitment."><meta property="article:published_time" content="2026-09-29T07:19:52.879Z">`,
    `<article>
      <div data-block="headline"><h1>Inside Liverpool's youth investment</h1></div>
      <div data-block="image"><figure><div><figcaption><p>Image caption, Mor Talla Ndiaye made the move to Liverpool after the U17 World Cup</p></figcaption></div></figure></div>
      <div data-block="byline">ByAadam PatelFootball reporter</div>
      <div data-block="text"><div data-testid="rich-text"><p>${long("Liverpool may have made three signings worth more than £100m each.")}</p>
        <p><a href="/sport/football/read-more">Read more about Liverpool's youth plans and academy</a></p></div></div>
      <div data-block="subheadline"><h2>Ndiaye's incredible story from Senegal</h2></div>
      <div data-block="text"><div data-testid="rich-text"><p>${long("Mor Talla Ndiaye's journey began in Sandiara.")}</p></div></div>
      <div data-block="promoList"><p>More on this story and other things to read</p></div>
    </article>`
  );
  it("drops the caption lead, link-only teasers and promo; keeps the sub-headline", async () => {
    const { content } = (await extractFromHtml(html, "https://www.bbc.co.uk/sport/football/articles/abc"))!;
    expect(content.paragraphs[0]).toMatch(/^Liverpool may have made three signings/);
    expect(content.paragraphs.some((p) => /Image caption|Read more|More on this story/.test(p))).toBe(false);
    expect(content.paragraphs).toContain("Ndiaye's incredible story from Senegal");
    expect(content.publishedAt).toBe("2026-09-29T07:19:52.879Z");
  });
});

describe("Guardian", () => {
  const html = page(
    `<meta property="og:title" content="Bournemouth 0-1 Liverpool: Premier League – as it happened">`,
    `<main id="maincontent"><article>
       <div><p>${long("Liverpool have appointed Julian Ward.")}</p></div>
       <aside aria-label="newsletter promotion"><div><p>Sign up to Football Daily</p><p>Kick off your evenings with the Guardian's take on the world of football and more</p></div></aside>
       <div><p>${long("Ward has worked for Liverpool for 14 years.")}</p></div>
     </article></main>`
  );
  it("skips the newsletter promo and falls back to og:title when there is no h1", async () => {
    const { content } = (await extractFromHtml(html, "https://www.theguardian.com/football/live/2026/sep/20/x-live"))!;
    expect(content.title).toBe("Bournemouth 0-1 Liverpool: Premier League – as it happened");
    expect(content.paragraphs).toHaveLength(2);
    expect(content.paragraphs.join(" ")).not.toMatch(/Sign up to|Kick off your evenings/);
    expect(content.htmlContent).not.toMatch(/newsletter|Sign up to/);
  });
});

describe("bot-check pages and thin scrapes", () => {
  it("returns null for the ESPN 'JavaScript is disabled' page (never cached)", async () => {
    const html = page(`<title>ESPN</title>`, `<noscript></noscript><p>JavaScript is disabled in your browser. Please enable JavaScript to proceed.</p>`);
    expect(await extractFromHtml(html, "https://www.espn.com/soccer/story/_/id/1/x")).toBeNull();
    expect(isBotChallengePage(cheerio.load(html))).toBe(true);
    expect(isBotChallengePage(cheerio.load(page(`<title>Just a moment...</title>`, "<p>x</p>")))).toBe(true);
  });
  it("does not flag a normal long article that mentions javascript", async () => {
    const body = `<article>${"<p>Liverpool beat Arsenal in a long match report with javascript is disabled mention.</p>".repeat(60)}</article>`;
    expect(isBotChallengePage(cheerio.load(page("", body)))).toBe(false);
  });
  it("marks an empty body as not cacheable", async () => {
    const html = page(`<meta property="og:title" content="Empty"><meta property="og:description" content="Only a description here that is long enough.">`, `<div></div>`);
    const r = (await extractFromHtml(html, "https://www.liverpoolecho.co.uk/news/x-123"))!;
    expect(r.cacheable).toBe(false);
    expect(r.content.isThinContent).toBe(true);
  });
});

describe("generic extractor", () => {
  it("never falls back to <body> menus (anfieldindex)", async () => {
    const menu = `<ul>${Array.from({ length: 30 }, (_, i) => `<li><a href="/c${i}">Category ${i}</a></li>`).join("")}</ul>`;
    const html = page(`<meta property="og:title" content="Story">`, `<nav>${menu}</nav><div>${menu}</div>`);
    const r = (await extractFromHtml(html, "https://anfieldindex.com/101356/story.html"))!;
    expect(r.content.paragraphs).toEqual([]);
    expect(r.content.htmlContent).toBeUndefined();
    expect(r.cacheable).toBe(false);
  });
  it("detects navigation-like containers by link density", () => {
    const $ = cheerio.load(`<div id="a"><a href="/1">One</a> <a href="/2">Two</a> <a href="/3">Three</a></div><div id="b"><p>${"Real prose about Liverpool. ".repeat(20)}<a href="/x">link</a></p></div>`);
    expect(isNavigationLike($("#a"), $)).toBe(true);
    expect(isNavigationLike($("#b"), $)).toBe(false);
  });
  it("maps Mirror / MEN / liverpool.com to the Reach (Echo) extractor", async () => {
    const html = page(`<meta property="og:title" content="Fowler and Owen">`, `<article id="article-body" data-testid="body"><p>${long("Michael Owen and Robbie Fowler disagree.")}</p></article>`);
    for (const host of ["www.mirror.co.uk", "www.manchestereveningnews.co.uk", "www.liverpool.com"]) {
      const { content } = await run(html, `https://${host}/sport/x-123`);
      expect(content.paragraphs).toHaveLength(1);
    }
  });
  it("cleans CMS boilerplate from the description and drops a description equal to the title", async () => {
    const html = page(
      `<meta property="og:title" content="£26m Liverpool star wanted"><meta property="og:description" content="£26m Liverpool star wanted written on October 4, 2026 by Zachary Lewis. This article is about Featured, Liverpool FC News.">`,
      `<article><p>${long("Giovanni Leoni transfer latest.")}</p></article>`
    );
    const { content } = await run(html, "https://anfieldindex.com/1/story.html");
    expect(content.description).toBeUndefined();
  });
});

describe("ESPN leading byline lines", () => {
  it("strips byline / timestamp / video caption openers but keeps the lede", () => {
    expect(
      stripLeadingMetaLines([
        "Beth LindopSep 30, 2026, 03:24 AM ETCloseBased in Liverpool, Beth Lindop is ESPN's Liverpool correspondent and also covers the WSL.",
        "Beth LindopSep 30, 2026, 03:24 AM ET",
        "\"Clearly there's not another Alexander Isak, that's obvious.\" That was the admission of Sweden boss Graham Potter.",
      ])
    ).toHaveLength(1);
    expect(stripLeadingMetaLines(["Xavi reveals trip to Liverpool to speak to Van Dijk (0:58)", "Sep 27, 2026, 06:32 PM ET", "The Netherlands and Liverpool must wait."])).toEqual(["The Netherlands and Liverpool must wait."]);
  });
});

describe("dates and authors", () => {
  const meta = (head: string) => page(head, `<article><p>${long("Body text for Liverpool.")}</p></article>`);
  it("reads JSON-LD datePublished and zone-less dates as +07:00", async () => {
    const ld = `<script type="application/ld+json">{"@graph":[{"@type":"NewsArticle","datePublished":"2026-09-28 07:56:59","author":{"name":"Tạp chí Bóng đá"}}]}</script>`;
    const { content } = await run(meta(ld), "https://www.liverpoolecho.co.uk/news/x-1");
    expect(content.publishedAt).toBe("2026-09-28T00:56:59.000Z");
    expect(content.author).toBe("Tạp chí Bóng đá");
  });
  it("normalises '+7:00' and tolerates a URL in article:author", async () => {
    const head = `<meta property="article:published_time" content="2026-09-28T07:56:59+7:00"><meta property="article:author" content="https://www.facebook.com/baobongda"><meta name="author" content="Tạp chí Bóng đá">`;
    const { content } = await run(meta(head), "https://www.liverpoolecho.co.uk/news/x-2");
    expect(content.publishedAt).toBe("2026-09-28T00:56:59.000Z");
    expect(content.author).toBe("Tạp chí Bóng đá");
  });
  it("reads LFC publishedAt and 'By …' author from __NEXT_DATA__", async () => {
    const data = { props: { pageProps: { newsArticle: { publishedAt: "2026-10-02T21:01:16.000Z", authors: [], metaDescription: "By Sam Williams", blocks: [{ type: "formattedText", formattedText: `<p>${long("Kerkez scored his first international goal.")}</p>` }] } } } };
    const html = page(`<meta property="og:title" content="Kerkez scores">`, `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script><main><p>x</p></main>`);
    const { content } = await run(html, "https://www.liverpoolfc.com/news/kerkez");
    expect(content.publishedAt).toBe("2026-10-02T21:01:16.000Z");
    expect(content.author).toBe("Sam Williams");
  });
});

describe("Vietnamese extractors", () => {
  it("keeps cdn.24h images, drops minigame / FPT / hidden junk and makes links absolute", async () => {
    const html = page(
      `<meta property="og:title" content="Bournemouth - Liverpool"><meta property="og:description" content="Lead sentence of the story about Isak and Iraola today.">`,
      `<div class="cate-24h-foot-arti-deta-info">
        <p><strong>Lead sentence of the story about Isak and Iraola today.</strong></p>
        <p>Isak ghi bàn giúp Liverpool thắng trận, <a href="/bong-da/tin-lien-quan-c48.html">xem thêm</a> và <a href="#top">lên đầu</a>.</p>
        <p><img alt="Isak ăn mừng bàn thắng" data-original="https://cdn.24h.com.vn/upload/4-2026/images/isak.jpg" src="data:image/gif;base64,AAA"></p>
        <div class="data-embed-code-minigame"><a href="https://www.24h.com.vn/minigame-du-doan-ty-so.html">Dự đoán tỷ số trúng thưởng</a></div>
        <div class="hide"><p>Hidden promo text that must not render</p></div>
        <div style="display:none"><p>Display none block</p></div>
        <p><strong>FPT Play mang Ngoại Hạng Anh đến mọi nhà, tại</strong>: <a href="https://share.fptplay.vn/x">link</a></p>
      </div>`
    );
    const { content } = await run(html, "https://www.24h.com.vn/bong-da/x-c48a1.html");
    const h = content.htmlContent!;
    expect(content.images).toContain("https://cdn.24h.com.vn/upload/4-2026/images/isak.jpg");
    expect(h).toContain("cdn.24h.com.vn/upload/4-2026/images/isak.jpg");
    expect(h).not.toMatch(/minigame|FPT Play|Hidden promo|Display none|trúng thưởng/);
    expect(h).toContain('href="https://www.24h.com.vn/bong-da/tin-lien-quan-c48.html"');
    expect(h).not.toContain('href="#top"');
    expect(h).not.toMatch(/class="sapo"/); // lead == description: not printed twice
  });
  it("tuoitre: removes the 'Đọc tiếp / Về trang Chủ đề' box", async () => {
    const html = page(``, `<div class="detail-content afcbc-body"><p>${long("Bournemouth bất lợi về thời gian hồi phục.")}</p><div class="readmore-body-box d-none"><a>Đọc tiếp</a><a href="/nhom-chu-de.htm">Về trang Chủ đề</a></div></div>`);
    const { content } = await run(html, "https://tuoitre.vn/x-100260919193710492.htm");
    expect(content.htmlContent).not.toMatch(/Đọc tiếp|Về trang Chủ đề/);
  });
  it("dantri: body from [data-slot=content], sapo once, dateline prefix stripped", async () => {
    const sapo = "Fulham gây tranh cãi với tình huống đòi phạt đền nhưng bất thành, còn Liverpool may mắn thoát thua.";
    const html = page(
      `<meta property="og:description" content="(Dân trí) - ${sapo}">`,
      `<article data-slot="container"><h1 data-slot="title">Liverpool hòa Fulham</h1><h2 data-slot="sapo">(Dân trí) - ${sapo}</h2><div data-slot="content"><p>${long("Liverpool đã có một trận đấu đáng thất vọng.")}</p></div></article>`
    );
    const { content } = await run(html, "https://dantri.com.vn/the-thao/x-20260913004747933.htm");
    expect(content.description).toBe(sapo);
    expect(content.paragraphs.filter((p) => p.includes("Fulham gây tranh cãi"))).toHaveLength(0);
    expect((content.htmlContent ?? "").match(/Fulham gây tranh cãi/g) ?? []).toHaveLength(0);
    expect(content.paragraphs[0]).toMatch(/^Liverpool đã có/);
  });
  it("bongda: prefers og:title over the truncated h1", async () => {
    const html = page(`<meta property="og:title" content="Thất sủng tại Anfield, Chiesa được ba ông lớn Serie A săn đón">`, `<section class="contentDetail"><h1>Thất sủng tại Anfield, Chiesa được ba ông lớn Serie A săn đ…</h1><p>${long("Chiesa chật vật tìm chỗ đứng.")}</p></section>`);
    expect((await run(html, "https://bongda.com.vn/x-d1.html")).content.title).toBe("Thất sủng tại Anfield, Chiesa được ba ông lớn Serie A săn đón");
  });
  it("bongda24h: drops a leading heading equal to the title", async () => {
    const html = page(`<meta property="og:title" content="Chiesa chia tay Liverpool vào tháng 1">`, `<h1>Chiesa chia tay Liverpool vào tháng 1</h1><div class="the-article-content"><h2>Chiesa chia tay Liverpool vào tháng 1</h2><p>${long("Premier League sẽ trở lại trong tháng này.")}</p></div>`);
    const { content } = await run(html, "https://bongda24h.vn/x-172-461342.html");
    expect(content.htmlContent).not.toMatch(/<h2>Chiesa chia tay/);
  });
  it("bongdaplus: #postContent body, sapo from .summary", async () => {
    const html = page(
      `<meta property="og:description" content="Mô tả ngắn khác hẳn của bài viết về Isak.">`,
      `<h1>Liverpool thấp thỏm vì Isak</h1><div class="cont-view"><div class="summary bdr"><b>Alexander Isak sớm rời đội tuyển Thụy Điển vì chấn thương nhẹ ở đùi.</b></div><div id="postContent"><p>${long("Alexander Isak sẽ không tiếp tục sát cánh cùng đội tuyển.")}</p></div></div><div class="sidebar"><p>${long("Tin liên quan không được lấy.")}</p></div>`
    );
    const { content } = await run(html, "https://bongdaplus.vn/ngoai-hang-anh/x-5236872609.html");
    expect(content.paragraphs[0]).toMatch(/^Alexander Isak sớm rời/);
    expect(content.paragraphs.join(" ")).not.toMatch(/Tin liên quan/);
  });
});

describe("video handling", () => {
  const body = (video: string) => page(``, `<div class="detail-content afcbc-body"><p>${long("Intro paragraph for the video story.")}</p>${video}</div>`);
  it("drops a <video> with no playable source", async () => {
    const { content } = await run(body(`<video controls></video>`), "https://tuoitre.vn/v-1.htm");
    expect(content.htmlContent).not.toContain("<video");
  });
  it("converts video[data-src] and HLS <source> into the reader placeholder", async () => {
    const lazy = await run(body(`<video data-src="/media/clip.mp4" poster="/p.jpg"></video>`), "https://tuoitre.vn/v-2.htm");
    expect(lazy.content.htmlContent).toContain('class="article-video-player"');
    expect(lazy.content.htmlContent).toContain('data-video-src="https://tuoitre.vn/media/clip.mp4"');
    expect(lazy.content.htmlContent).toContain('data-poster="https://tuoitre.vn/p.jpg"');
    expect(lazy.content.htmlContent).toContain('data-source-url="https://tuoitre.vn/v-2.htm"');
    expect(lazy.content.htmlContent).toContain('data-source-name="Tuổi Trẻ"');
    const hls = await run(body(`<video><source src="https://cdn.x/live/master.m3u8" type="application/x-mpegURL"></video>`), "https://tuoitre.vn/v-3.htm");
    expect(hls.content.htmlContent).toContain('data-video-src="https://cdn.x/live/master.m3u8"');
    expect(hls.content.htmlContent).not.toContain("<video");
  });
});
