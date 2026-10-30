import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchOgMeta } from "../og-meta";

/**
 * fetchOgMeta now also feeds the page for an article whose row has expired:
 * the headline and summary come from the publisher's <head>, read without a
 * full scrape. These pin the fields it reads and that it stops at </head>.
 */
function serve(html: string) {
  const bytes = new TextEncoder().encode(html);
  const read = vi.fn();
  vi.stubGlobal("fetch", vi.fn(async () => {
    let sent = false;
    return {
      ok: true,
      body: {
        getReader: () => ({
          read: read.mockImplementation(async () => (sent ? { done: true } : ((sent = true), { done: false, value: bytes }))),
          cancel: async () => {},
        }),
      },
    };
  }));
  return read;
}

afterEach(() => vi.unstubAllGlobals());

describe("fetchOgMeta", () => {
  it("reads headline, summary, picture and date from the head", async () => {
    serve(`<html><head>
      <meta property="og:title" content="Salah's late winner sinks Chelsea">
      <meta content='He said "never give up"' property="og:description">
      <meta property="og:image" content="https://i.example.com/salah.jpg">
      <meta property="article:published_time" content="2026-10-28T21:40:00Z">
      </head><body></body></html>`);
    const meta = await fetchOgMeta("https://www.liverpoolecho.co.uk/sport/x-1");
    expect(meta.title).toBe("Salah's late winner sinks Chelsea");
    expect(meta.description).toBe('He said "never give up"');
    expect(meta.image).toBe("https://i.example.com/salah.jpg");
    expect(meta.publishedAt).toBe("2026-10-28T21:40:00Z");
  });

  it("falls back to twitter:title and the plain description", async () => {
    serve(`<head><meta name="twitter:title" content="Gakpo fit"><meta name="description" content="Back in training."></head>`);
    const meta = await fetchOgMeta("https://www.bbc.co.uk/sport/football/articles/x");
    expect(meta.title).toBe("Gakpo fit");
    expect(meta.description).toBe("Back in training.");
  });

  it("returns nothing on an error response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })));
    expect(await fetchOgMeta("https://www.bbc.co.uk/x")).toEqual({});
  });
});
