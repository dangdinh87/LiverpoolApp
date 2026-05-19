import { describe, expect, it } from "vitest";
import { extractImageUrlFromHtml, sanitizeImageUrl } from "../image";

describe("news image helpers", () => {
  it("normalizes relative and protocol-relative image URLs", () => {
    expect(sanitizeImageUrl("/images/story.jpg", "https://example.com/news/1")).toBe(
      "https://example.com/images/story.jpg"
    );
    expect(sanitizeImageUrl("//cdn.example.com/story.jpg")).toBe(
      "https://cdn.example.com/story.jpg"
    );
  });

  it("extracts og image tags with single quotes", () => {
    expect(
      extractImageUrlFromHtml(
        "<meta property='og:image' content='/uploads/story.jpg'>",
        "https://example.com/a"
      )
    ).toBe("https://example.com/uploads/story.jpg");
  });

  it("extracts RSS description images", () => {
    expect(
      extractImageUrlFromHtml(
        '<p><img data-src="/thumbs/salah.jpg" src="data:image/gif;base64,abc"></p>',
        "https://bongda.example/news/story"
      )
    ).toBe("https://bongda.example/thumbs/salah.jpg");
  });

  it("extracts images from escaped RSS HTML", () => {
    expect(
      extractImageUrlFromHtml(
        '&lt;p&gt;&lt;img src=&quot;/thumbs/slot.jpg&quot;&gt;&lt;/p&gt;',
        "https://bongda.example/news/story"
      )
    ).toBe("https://bongda.example/thumbs/slot.jpg");
  });

  it("extracts JSON-LD image objects", () => {
    expect(
      extractImageUrlFromHtml(
        '<script type="application/ld+json">{"image":{"url":"https://cdn.example.com/hero.webp"}}</script>'
      )
    ).toBe("https://cdn.example.com/hero.webp");
  });
});
