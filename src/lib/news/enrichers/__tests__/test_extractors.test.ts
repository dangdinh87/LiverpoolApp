// Vietnamese source chrome: the per-source selectors must take the article body
// and leave the furniture that sits beside it.
//
// These two cases used to fetch live article URLs over the network. That made
// `npm run test` depend on the internet, on those articles still existing and
// on how fast two Vietnamese news sites answered — one of them began timing out
// inside the 5s default, and VnExpress had meanwhile renamed the slug, so the
// request was only reaching the body through a 301. They now run against markup
// in the file, like every sibling suite in this directory.
import { describe, expect, it, vi } from "vitest";
import { extractFromHtml } from "../article-extractor";

vi.mock("../../supabase-service", () => ({ getServiceClient: () => ({}) }));

const page = (head: string, body: string) => `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;
const long = (s: string) => `${s} ${"Liverpool chơi tốt tại Anfield hôm nay. ".repeat(2)}`;

describe("VnExpress", () => {
  it("reads .fck_detail and names the source", async () => {
    const html = page(
      `<meta property="og:title" content="Liverpool thắng Real khi Mbappe đá hỏng phạt đền">`,
      `<h1 class="title-detail">Liverpool thắng Real khi Mbappe đá hỏng phạt đền</h1>
       <article class="fck_detail">
         <p class="Normal">${long("Liverpool vượt qua Real Madrid trong loạt sút luân lưu.")}</p>
         <p class="Normal">${long("Mbappe là người duy nhất không thành công.")}</p>
       </article>
       <div class="sidebar-1"><p>${long("Tin liên quan không được lấy vào bài.")}</p></div>`
    );
    const res = (await extractFromHtml(html, "https://vnexpress.net/liverpool-thang-real-khi-mbappe-da-hong-phat-den-4821215.html"))!.content;
    expect(res.title).toBeTruthy();
    expect(res.paragraphs.length).toBeGreaterThan(0);
    expect(res.sourceName).toBe("VnExpress");
    expect(res.paragraphs.join(" ")).not.toMatch(/Tin liên quan/);
  });
});

describe("Bongda24h", () => {
  // `.pswp` (the photo-lightbox shell), the byline, the tag list, the "related"
  // link block and the share bar are all siblings of `.the-article-content`
  // inside `article.the-article`, so a selector one level too high sweeps them
  // all into the body.
  const html = page(
    `<meta property="og:title" content="Vì lý do này, Liverpool có cơ hội chiêu mộ Kylian Mbappe">`,
    `<article class="the-article">
       <div class="the-article-header"><h1>Vì lý do này, Liverpool có cơ hội chiêu mộ Kylian Mbappe</h1></div>
       <div class="the-article-author">Theo Dương Linh</div>
       <div class="the-article-content">
         <p><strong>${long("Kylian Mbappe có thể rời Real Madrid vào mùa hè.")}</strong></p>
         <p>${long("Liverpool đang theo dõi sát tình hình của tiền đạo người Pháp.")}</p>
         <p>${long("Bản hợp đồng sẽ phá vỡ mọi kỷ lục chuyển nhượng của giải đấu.")}</p>
         <p>${long("Arne Slot được cho là người ủng hộ thương vụ này.")}</p>
         <p>${long("Mức lương vẫn là rào cản lớn nhất với phía Anfield.")}</p>
         <p>${long("Real Madrid chưa đưa ra bất kỳ bình luận chính thức nào.")}</p>
       </div>
       <div class="pswp" tabindex="-1" role="dialog"><div class="pswp__bg"></div></div>
       <div class="the-article-tags"><a href="/tag/liverpool.html">Liverpool</a></div>
       <div class="the-article-link"><a href="/tin-lien-quan.html">Tin liên quan</a></div>
       <div class="article-socal"><a href="#">Chia sẻ Facebook</a></div>
     </article>`
  );

  it("takes the article body, names the source, and leaves the page chrome behind", async () => {
    const res = (await extractFromHtml(html, "https://bongda24h.vn/bong-da-tay-ban-nha/vi-ly-do-nay-liverpool-co-co-hoi-chieu-mo-kylian-mbappe-180-451491.html"))!.content;

    expect(res.title).toBe("Vì lý do này, Liverpool có cơ hội chiêu mộ Kylian Mbappe");
    expect(res.sourceName).toBe("Bóng Đá 24h");
    expect(res.paragraphs.length).toBeGreaterThan(5);
    expect(res.paragraphs[0]).toContain("Kylian Mbappe");

    const h = res.htmlContent!;
    // Positive anchor: without it the loop below would pass on an empty body.
    expect(h).toContain("tiền đạo người Pháp");
    for (const chrome of ["the-article-author", "the-article-tags", "the-article-link", "the-article-header", "article-socal", "pswp"]) {
      expect(h, `${chrome} leaked into the article body`).not.toContain(chrome);
    }
  });
});
