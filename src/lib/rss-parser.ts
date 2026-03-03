// Server-only: never import this in client components
import "server-only";
import { cache } from "react";
import Parser from "rss-parser";

export interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  thumbnail?: string;
}

const parser = new Parser({
  customFields: {
    item: [["media:thumbnail", "mediaThumbnail"]],
  },
});

// rss-parser returns mediaThumbnail as { $: { url: string } } or a plain string
function extractThumbnailUrl(raw: unknown): string | undefined {
  if (!raw) return undefined;
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    const attrs = obj["$"] as Record<string, unknown> | undefined;
    if (typeof attrs?.url === "string") return attrs.url;
  }
  return undefined;
}

const BBC_LIVERPOOL_RSS =
  "https://feeds.bbci.co.uk/sport/football/teams/liverpool/rss.xml";

export const getNews = cache(async (limit = 20): Promise<NewsArticle[]> => {
  try {
    const feed = await parser.parseURL(BBC_LIVERPOOL_RSS);
    return feed.items.slice(0, limit).map((item) => ({
      title: item.title ?? "Untitled",
      link: item.link ?? "#",
      pubDate: item.pubDate ?? new Date().toISOString(),
      contentSnippet: item.contentSnippet ?? item.content ?? "",
      thumbnail: extractThumbnailUrl(
        (item as unknown as Record<string, unknown>).mediaThumbnail
      ),
    }));
  } catch (err) {
    console.error("[rss-parser] Failed to fetch news:", err);
    return getMockNews();
  }
});

function getMockNews(): NewsArticle[] {
  return [
    {
      title: "Liverpool extend Premier League lead with dominant display",
      link: "https://www.bbc.co.uk/sport/football/liverpool",
      pubDate: new Date(Date.now() - 3600000).toISOString(),
      contentSnippet:
        "Liverpool moved further clear at the top of the Premier League after a convincing victory at Anfield.",
      thumbnail: undefined,
    },
    {
      title: "Salah reaches 200 Premier League goal milestone",
      link: "https://www.bbc.co.uk/sport/football/liverpool",
      pubDate: new Date(Date.now() - 86400000).toISOString(),
      contentSnippet:
        "Mohamed Salah became the first African player to score 200 Premier League goals.",
      thumbnail: undefined,
    },
    {
      title: "Van Dijk signs new long-term deal at Anfield",
      link: "https://www.bbc.co.uk/sport/football/liverpool",
      pubDate: new Date(Date.now() - 172800000).toISOString(),
      contentSnippet:
        "Virgil van Dijk has committed his future to Liverpool by signing an extended contract.",
      thumbnail: undefined,
    },
    {
      title: "Arne Slot reflects on Liverpool's impressive unbeaten run",
      link: "https://www.bbc.co.uk/sport/football/liverpool",
      pubDate: new Date(Date.now() - 259200000).toISOString(),
      contentSnippet:
        "The Liverpool manager praised his squad's mentality and consistency throughout the campaign.",
      thumbnail: undefined,
    },
    {
      title: "Champions League last-16 preview: Liverpool's European journey continues",
      link: "https://www.bbc.co.uk/sport/football/liverpool",
      pubDate: new Date(Date.now() - 345600000).toISOString(),
      contentSnippet:
        "Liverpool prepare for their Champions League knockout tie with high spirits after strong league form.",
      thumbnail: undefined,
    },
    {
      title: "Gravenberch named PFA Player of the Month",
      link: "https://www.bbc.co.uk/sport/football/liverpool",
      pubDate: new Date(Date.now() - 432000000).toISOString(),
      contentSnippet:
        "Ryan Gravenberch picked up the monthly award after a series of outstanding midfield performances.",
      thumbnail: undefined,
    },
  ];
}
