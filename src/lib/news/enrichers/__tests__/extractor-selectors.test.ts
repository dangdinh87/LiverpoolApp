import { afterEach, describe, expect, it, vi } from "vitest";
import { scrapeArticle } from "../article-extractor";
import { NEWS_USER_AGENT } from "../../http";

// Offline: fixtures mirror the live markup verified 2026-10-04.
vi.mock("../../supabase-service", () => ({
  getServiceClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }),
      update: () => ({ eq: async () => ({}) }),
    }),
  }),
}));

function stubFetch(url: string, html: string) {
  const fn = vi.fn().mockResolvedValue({ ok: true, status: 200, url, text: async () => html });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

const P1 = "The 24-year-old has become one of Europe's most dangerous attacking players this season.";
const P2 = "According to reports, Liverpool are keeping a close eye on the winger's situation.";

describe("scrapeArticle", () => {
  it("reads liverpoolfc.com articles from pageProps.newsArticle.blocks and keeps images", async () => {
    const data = {
      props: {
        pageProps: {
          newsArticle: {
            blocks: [
              { type: "formattedText", formattedText: `<p>${P1}</p><p>${P2}</p>` },
              { type: "image", image: { sizes: { xs: { url: "https://x/xs.jpg" }, lg: { url: "https://x/lg.jpg" } } } },
            ],
          },
        },
      },
    };
    const html = `<html><head><meta property="og:title" content="Olise - Liverpool FC"></head><body><main><h1>Olise</h1></main>
      <script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script></body></html>`;
    stubFetch("https://www.liverpoolfc.com/news/olise", html);

    const res = await scrapeArticle("https://www.liverpoolfc.com/news/olise");
    expect(res?.paragraphs).toEqual([P1, P2]);
    expect(res?.images).toEqual(["https://x/lg.jpg"]);
    expect(res?.sourceName).toBe("LiverpoolFC.com");
  });

  it("still reads the legacy pageProps.data.article.body shape", async () => {
    const data = { props: { pageProps: { data: { article: { body: [{ type: "paragraph", value: `<b>${P1}</b>` }] } } } } };
    const html = `<html><body><main></main><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script></body></html>`;
    stubFetch("https://www.liverpoolfc.com/news/old", html);
    const res = await scrapeArticle("https://www.liverpoolfc.com/news/old");
    expect(res?.paragraphs).toEqual([P1]);
  });

  it("extracts Empire of the Kop from #article-body (not the comment form)", async () => {
    const html = `<html><body><article><h1>EOTK</h1><div id="article-body"><p>${P1}</p><p>${P2}</p></div>
      <form id="commentform"><p>Leave a comment on this story below please.</p></form></article></body></html>`;
    stubFetch("https://www.empireofthekop.com/2026/10/04/x/", html);
    const res = await scrapeArticle("https://www.empireofthekop.com/2026/10/04/x/");
    expect(res?.paragraphs).toEqual([P1, P2]);
  });

  it("extracts Liverpool Echo from article#article-body and sends the honest UA", async () => {
    const html = `<html><body><article id="article-body" class="ArticleBody_article__x" data-testid="body">
      <p>${P1}</p><p>Sign up to our newsletter for the latest news every morning please.</p><p>${P2}</p></article></body></html>`;
    const fetchMock = stubFetch("https://www.liverpoolecho.co.uk/sport/x-1", html);
    const res = await scrapeArticle("https://www.liverpoolecho.co.uk/sport/x-1");
    expect(res?.paragraphs).toEqual([P1, P2]);
    expect(fetchMock.mock.calls[0][1].headers["User-Agent"]).toBe(NEWS_USER_AGENT);
    expect(res?.sourceName).toBe("Liverpool Echo");
  });

  it("uses the ZNews extractor for lifestyle.zingnews.vn links", async () => {
    const html = `<html><body><article><div class="the-article-body"><p>${P1}</p><p>${P2}</p></div></article></body></html>`;
    stubFetch("https://lifestyle.zingnews.vn/x-post1.html", html);
    const res = await scrapeArticle("https://lifestyle.zingnews.vn/x-post1.html");
    expect(res?.sourceName).toBe("ZNews");
    expect(res?.paragraphs).toEqual([P1, P2]);
  });

  it("does not scrape link-out-only sources (This Is Anfield)", async () => {
    const fetchMock = stubFetch("https://www.thisisanfield.com/x/", "<html></html>");
    expect(await scrapeArticle("https://www.thisisanfield.com/2026/10/x/")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("extracts paragraphs for known sources without a dedicated extractor when Readability fails", async () => {
    const html = `<html><head><meta property="og:title" content="T"></head><body><nav><p>Navigation paragraph that is long enough to count.</p></nav>
      <article><h1>T</h1><p>${P1}</p></article></body></html>`;
    stubFetch("https://www.skysports.com/football/x/1", html);
    const res = await scrapeArticle("https://www.skysports.com/football/x/1");
    expect(res?.paragraphs).toContain(P1);
    expect(res?.paragraphs).not.toContain("Navigation paragraph that is long enough to count.");
  });
});
