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
});
