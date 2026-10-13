import { describe, expect, it } from "vitest";
import { cleanDigestText, fixBrandName, fixJoinedWords } from "../digest-text";
import type { DigestRecord } from "../digest";

describe("fixJoinedWords: spaces the model dropped", () => {
  it.each([
    // The strings found on the live briefing pages.
    ["mùa2026/27", "mùa 2026/27"],
    ["Iraola:7 trận", "Iraola: 7 trận"],
    ["cóảnh hưởng", "có ảnh hưởng"],
    ["Liverpoolở", "Liverpool ở"],
    ["dự bị.Ở", "dự bị. Ở"],
    // The same families of mistake.
    ["Tỷ số:2-1", "Tỷ số: 2-1"],
    ["thua đậm.Liverpool đã", "thua đậm. Liverpool đã"],
    ["Slot,Salah và Gakpo", "Slot, Salah và Gakpo"],
    ["đội hình,7 cầu thủ", "đội hình, 7 cầu thủ"],
    ["Sao thế?Vì chấn thương", "Sao thế? Vì chấn thương"],
    ["Thắng rồi!Slot nói", "Thắng rồi! Slot nói"],
    ["Hai đội;Chelsea trước", "Hai đội; Chelsea trước"],
    ["trong vòng12 và 90phút", "trong vòng 12 và 90 phút"],
    ["sau 7trận", "sau 7 trận"],
    ["since2026 the club", "since 2026 the club"],
    ["Mr.Slot said", "Mr. Slot said"],
    ["Anfield.They won", "Anfield. They won"],
    ["Liverpoolđã thắng", "Liverpool đã thắng"],
    ["Jeremie Frimpongở phía bên kia", "Jeremie Frimpong ở phía bên kia"],
    ["bị chọn làứng viên", "bị chọn là ứng viên"],
    ["vụ115 cáo buộc", "vụ 115 cáo buộc"],
    ["suất dự bị cạnh tranh épở hàng thủ", "suất dự bị cạnh tranh ép ở hàng thủ"],
    ["sânở Anfield", "sân ở Anfield"],
    ["tiênở", "tiên ở"],
    ["kinh nghiệmở", "kinh nghiệm ở"],
    ["đáLiverpool", "đá Liverpool"],
  ])("%s -> %s", (input, expected) => {
    expect(fixJoinedWords(input)).toBe(expected);
  });

  it.each([
    "20:30",
    "kick-off 20:30 on Saturday",
    "2-1",
    "Liverpool 2:1 Arsenal",
    "3.5 triệu",
    "1,5 triệu và 1,000 người",
    "U23",
    "Euro2024",
    "v4",
    "mp3",
    "VnExpress",
    "McAllister",
    "iPhone",
    "eBay",
    "YouTube",
    "e.g.",
    "v.v.",
    "U.S.",
    "No.1",
    "Next.js",
    "Next.JS",
    "https://www.bbc.co.uk/sport/football/articles/c1.html?at_medium=RSS",
    "www.liverpoolfc.com",
    "Football-Data.org",
    "tin@anfielddaily.com",
    "(xem https://bbc.com/x:1)",
    "Ekitiké",
    "Núñez",
    "Sadio Mané",
    "500đ",
    "hâm mộộng",
    "mở",
    "thở",
    "trở lại",
    "bởi vì",
    "cởi mở",
    "quở",
    "giở",
    "nghỉ ngơi",
    "Ở đâu",
    "mùa 2026/27",
    "Iraola: 7 trận",
    "Liverpool ở Anfield",
    "Tp. Hồ Chí Minh",
    "Hai &amp; ba",
    "...",
  ])("leaves %s alone", (input) => {
    expect(fixJoinedWords(input)).toBe(input);
  });

  it("is idempotent", () => {
    const once = fixJoinedWords("mùa2026/27. Iraola:7 trận,cóảnh hưởng.Ở Liverpoolở");
    expect(fixJoinedWords(once)).toBe(once);
  });

  it("repairs a whole paragraph without touching its links", () => {
    expect(
      fixJoinedWords("Mùa2026/27 mở màn. Theo https://bbc.co.uk/sport/a.b:1 thì Iraola:7 trận."),
    ).toBe("Mùa 2026/27 mở màn. Theo https://bbc.co.uk/sport/a.b:1 thì Iraola: 7 trận.");
  });

  it("composes decomposed Vietnamese before looking at it", () => {
    // "ả" typed as a + U+0309: the two tone marks are still two tone marks.
    expect(fixJoinedWords("cóảnh")).toBe("có ảnh");
  });
});

describe("fixBrandName", () => {
  it("replaces the name this site never had", () => {
    expect(fixBrandName("Liverpool Daily — 12 October 2026")).toBe("Anfield Daily — 12 October 2026");
    expect(fixBrandName("Anfield Daily — 12 October 2026")).toBe("Anfield Daily — 12 October 2026");
  });
});

describe("cleanDigestText", () => {
  const row: DigestRecord = {
    id: "id",
    digest_date: "2026-10-13",
    title: "Liverpool Daily — Thứ Ba",
    summary: "Mùa2026/27 vừa mở màn.",
    sections: [
      { category: "match", headline: "Iraola:7 trận", body: "cóảnh hưởng", articleUrls: ["https://bbc.co.uk/a.b:1"] },
      {
        category: "__seo_article__",
        headline: "h",
        body: "b",
        articleUrls: [],
        hidden: true,
        seoArticle: {
          sourceName: "Liverpool Daily",
          sourceUrl: "https://example.com",
          badgeLabel: "Liverpool Daily",
          title: "Liverpoolở đâu",
          metaTitle: "m",
          metaDescription: "d",
          excerpt: "e",
          focusKeyword: "Liverpool news",
          secondaryKeywords: [],
          body: [{ heading: "dự bị.Ở", paragraphs: ["mùa2026"] }],
          conclusion: "c",
        },
      },
    ],
    seo_title: "Liverpool Daily",
    seo_description: "mùa2026",
    seo_article: null,
    article_ids: [],
    article_count: 1,
    model: "deepseek-v4-flash",
    tokens_used: 1,
    generated_at: "2026-10-13T00:00:00Z",
  };

  it("cleans every reader-facing field and leaves ids and URLs untouched", () => {
    const out = cleanDigestText(row);
    expect(out.title).toBe("Anfield Daily — Thứ Ba");
    expect(out.summary).toBe("Mùa 2026/27 vừa mở màn.");
    expect(out.sections[0]).toMatchObject({ headline: "Iraola: 7 trận", body: "có ảnh hưởng" });
    expect(out.sections[0].articleUrls).toEqual(["https://bbc.co.uk/a.b:1"]);
    const seo = out.sections[1].seoArticle!;
    expect(seo.sourceName).toBe("Anfield Daily");
    expect(seo.badgeLabel).toBe("Anfield Daily");
    expect(seo.title).toBe("Liverpool ở đâu");
    expect(seo.body[0]).toEqual({ heading: "dự bị. Ở", paragraphs: ["mùa 2026"] });
    expect(out.seo_title).toBe("Anfield Daily");
    expect(out.seo_description).toBe("mùa 2026");
    expect(out.id).toBe("id");
    expect(out.digest_date).toBe("2026-10-13");
  });

  it("does not mutate its input", () => {
    cleanDigestText(row);
    expect(row.title).toBe("Liverpool Daily — Thứ Ba");
  });

  it("survives a legacy row with fields missing", () => {
    const legacy = { title: "t", summary: "s", sections: [{ category: "x" }], seo_article: { title: "t", metaDescription: "d", body: [{}] } };
    expect(() => cleanDigestText(legacy as unknown as DigestRecord)).not.toThrow();
  });
});
