import { describe, expect, it } from "vitest";
import { decodeArticleSlug, encodeArticleSlug, isKnownNewsSourceUrl } from "@/lib/news-config";
import { SOURCE_HOST_TABLE } from "@/lib/news/source-hosts";
import { detectSource } from "@/lib/news/source-detect";

const roundTrip = (url: string) => decodeArticleSlug(encodeArticleSlug(url).split("/"));

describe("isKnownNewsSourceUrl", () => {
  it("accepts configured sources with or without www, and their subdomains", () => {
    expect(isKnownNewsSourceUrl("https://www.bbc.com/sport/football/123")).toBe(true);
    expect(isKnownNewsSourceUrl("https://bbc.com/sport/football/123")).toBe(true);
    expect(isKnownNewsSourceUrl("https://vnexpress.net/liverpool-1.html")).toBe(true);
    expect(isKnownNewsSourceUrl("https://e.vnexpress.net/news/sports/1.html")).toBe(true);
  });

  it("rejects other hosts, look-alike hosts and non-http schemes", () => {
    for (const url of [
      "https://evil.com/x",
      "https://bbc.com.evil.com/x",
      "https://notbbc.com/x",
      "http://169.254.169.254/latest/meta-data/",
      "http://localhost:3000/api/news/sync",
      "file:///etc/passwd",
      "https://user:pass@www.bbc.com/x",
      "https://www.bbc.com:8443/x",
      "not a url",
    ]) {
      expect(isKnownNewsSourceUrl(url), url).toBe(false);
    }
  });

  it("guards the legacy base64 slug, which decodes to any URL", () => {
    const slug = Buffer.from("http://169.254.169.254/latest/").toString("base64url");
    const decoded = decodeArticleSlug([slug]);
    expect(decoded).toBe("http://169.254.169.254/latest/");
    expect(isKnownNewsSourceUrl(decoded!)).toBe(false);
  });
});

describe("article slug round-trip", () => {
  it("round-trips a canonical and a bare-domain URL for every source", () => {
    for (const e of SOURCE_HOST_TABLE) {
      for (const host of [e.canonical, ...e.domains, `sub.${e.domains[0]}`]) {
        const url = `https://${host}/some/path-1.html?x=1`;
        expect(roundTrip(url), url).toBe(url);
        expect(isKnownNewsSourceUrl(url), url).toBe(true);
        expect(detectSource(url).id, url).toBe(e.id);
      }
    }
  });

  it("handles BBC (bbc.co.uk) and ZNews (lifestyle.zingnews.vn) feed links", () => {
    for (const url of [
      "https://www.bbc.co.uk/sport/football/articles/c1234abcd",
      "https://lifestyle.zingnews.vn/bai-viet/liverpool-post123.html",
      "https://znews.vn/liverpool-post456.html",
    ]) {
      expect(roundTrip(url)).toBe(url);
      expect(encodeArticleSlug(url)).not.toMatch(/^ext\//);
    }
  });

  it("keeps existing /news/{source}/{path} slugs for canonical hosts valid", () => {
    expect(encodeArticleSlug("https://www.bbc.com/sport/football/1")).toBe("bbc/sport/football/1");
    expect(decodeArticleSlug(["bbc", "sport", "football", "1"])).toBe("https://www.bbc.com/sport/football/1");
    expect(decodeArticleSlug(["zingnews", "a-post1.html"])).toBe("https://znews.vn/a-post1.html");
  });

  it("rejects a host override that does not belong to the source", () => {
    expect(decodeArticleSlug(["bbc", "~evil.com", "x"])).toBeNull();
    expect(decodeArticleSlug(["bbc", "~bbc.com.evil.com", "x"])).toBeNull();
  });

  it("encodes unknown hosts as an opaque slug the guard still rejects", () => {
    const url = "https://evil.example.com/a";
    const decoded = roundTrip(url);
    expect(decoded).toBe(url);
    expect(isKnownNewsSourceUrl(decoded!)).toBe(false);
  });
});

describe("detectSource", () => {
  it("returns a neutral id for unknown hosts instead of defaulting to bbc", () => {
    expect(detectSource("https://example.org/x")).toEqual({ id: "unknown", name: "example.org" });
    expect(detectSource("https://bbc.com.evil.com/x").id).toBe("unknown");
  });
});
