import { describe, it, expect, vi } from "vitest";
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

describe("Extractor Sandbox", () => {
  it("extracts from Bongda", async () => {
    // using latest news from Bongda
    const url = "https://bongda.com.vn/danh-gia-chuyen-nhuong-arsenal-mua-nay-tuyet-voi-d758963.html";
    const res = await scrapeArticle(url);
    console.log("=== BONGDA ===");
    console.log(JSON.stringify(res, null, 2));
  }, 15000);

  it("extracts from 24h", async () => {
    // latest news 24h
    const url = "https://www.24h.com.vn/bong-da/nong-haaland-bi-dieu-tra-o-tay-ban-nha-do-tranh-cai-man-city-voi-real-c48a1562627.html";
    const res = await scrapeArticle(url);
    console.log("=== 24H ===");
    console.log(JSON.stringify(res, null, 2));
  });

  it("extracts from Bongdaplus", async () => {
    const url = "https://bongdaplus.vn/ngoai-hang-anh/liverpool-lap-ky-luc-vo-tien-khoang-hau-o-champions-league-sau-khi-ha-real-4261892403.html";
    const res = await scrapeArticle(url);
    console.log("=== BONGDAPLUS ===");
    console.log(JSON.stringify(res, null, 2));
  });

  it("extracts from VnExpress", async () => {
    const url = "https://vnexpress.net/real-thua-liverpool-o-champions-league-4861876.html";
    const res = await scrapeArticle(url);
    console.log("=== VNEXPRESS ===");
    console.log(JSON.stringify(res, null, 2));
  });

  it("extracts from ZNews", async () => {
    const url = "https://znews.vn/liverpool-thang-real-madrid-lan-dau-tien-sau-15-nam-post1528657.html";
    const res = await scrapeArticle(url);
    console.log("=== ZNEWS ===");
    console.log(JSON.stringify(res, null, 2));
  });

  it("extracts from Webthethao", async () => {
    const url = "https://webthethao.vn/bong-da-anh/klopp-xuat-hien-tai-anfield-liverpool-mo-tiec-an-mung-chien-thang-lich-su-101004.htm";
    const res = await scrapeArticle(url);
    console.log("=== WEBTHETHAO ===");
    console.log(JSON.stringify(res, null, 2));
  });
});
