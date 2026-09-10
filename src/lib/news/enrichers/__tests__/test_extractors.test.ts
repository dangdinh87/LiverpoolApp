import { describe, it, vi, expect } from "vitest";
import { scrapeArticle } from "../article-extractor";

vi.mock("../../supabase-service", () => ({
  getServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null })
        })
      }),
      update: () => ({
        eq: async () => ({})
      })
    })
  })
}));

describe("Test with different VnExpress URL", () => {
  it("extracts from VnExpress 2", async () => {
    const url = "https://vnexpress.net/ha-real-liverpool-ngat-huong-tren-dinh-champions-league-4821215.html";
    const res = await scrapeArticle(url);
    expect(res).toBeDefined();
    expect(res?.title).toBeTruthy();
    expect(res?.paragraphs?.length).toBeGreaterThan(0);
    expect(res?.sourceName).toBe("VnExpress");
  });

  it("extracts clean article body from Bongda24h", async () => {
    const url = "https://bongda24h.vn/bong-da-tay-ban-nha/vi-ly-do-nay-liverpool-co-co-hoi-chieu-mo-kylian-mbappe-180-451491.html";
    const res = await scrapeArticle(url);

    expect(res).toBeDefined();
    expect(res?.title).toBe("Vì lý do này, Liverpool có cơ hội chiêu mộ Kylian Mbappe");
    expect(res?.sourceName).toBe("Bóng Đá 24h");
    expect(res?.paragraphs?.length).toBeGreaterThan(5);
    // The sapo is still captured as the lead paragraph…
    expect(res?.paragraphs?.[0]).toContain("Kylian Mbappe");
    // …but is not repeated inside htmlContent, because the article layout already
    // renders `description` above the body and would print the sentence twice.
    expect(res?.htmlContent).not.toContain('class="sapo"');

    // Source page chrome must not survive into the body.
    expect(res?.htmlContent).not.toContain("the-article-author");
    expect(res?.htmlContent).not.toContain("the-article-tags");
    expect(res?.htmlContent).not.toContain("the-article-link");
    expect(res?.htmlContent).not.toContain("the-article-header");
    expect(res?.htmlContent).not.toContain("article-socal");
    expect(res?.htmlContent).not.toContain("pswp");
    // Non-video widgets (match-score box) ship light-theme CSS — drop them.
    expect(res?.htmlContent).not.toContain("<iframe");
  }, 15000);
});
