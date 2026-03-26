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

describe("Test with Bongdaplus", () => {
  it("extracts from Bongdaplus", async () => {
    const url = "https://bongdaplus.vn/ngoai-hang-anh/champions-league-the-thuc-moi-dang-phat-huy-tot-tac-dung-4261982403.html";
    const res = await scrapeArticle(url);
    expect(res).toBeDefined();
    expect(res?.title).toBeTruthy();
    expect(res?.paragraphs?.length).toBeGreaterThan(0);
    expect(res?.sourceName).toBe("Bongdaplus.vn");
  });
});
