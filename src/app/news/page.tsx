import type { Metadata } from "next";
import { getNews } from "@/lib/rss-parser";
import { NewsFeed } from "@/components/news/news-feed";

export const metadata: Metadata = {
  title: "News",
  description:
    "Latest Liverpool FC news from BBC Sport, The Guardian, Bongda.com.vn, 24h.com.vn and more.",
};

// ISR: revalidate every 30 minutes
export const revalidate = 1800;

export default async function NewsPage() {
  const articles = await getNews(20);

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <div className="relative h-[36vh] min-h-[280px] flex items-end">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('/assets/lfc/fans/fans-anfield-crowd.webp')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stadium-bg via-stadium-bg/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-stadium-bg/80 to-transparent" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 w-full">
          <p className="font-barlow text-lfc-red uppercase tracking-widest text-sm font-semibold mb-2">
            Multi-Source
          </p>
          <h1 className="font-bebas text-7xl md:text-8xl text-white tracking-wider leading-none mb-3">
            Latest News
          </h1>
          <p className="font-inter text-stadium-muted text-sm">
            Liverpool FC news from BBC Sport, The Guardian, Bongda.com.vn, 24h
            &amp; more
          </p>
        </div>
      </div>

      {/* News Feed */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">
        <NewsFeed articles={articles} />

        {/* Attribution */}
        <p className="text-center text-stadium-muted font-inter text-xs mt-10">
          News aggregated from{" "}
          <a
            href="https://www.bbc.co.uk/sport/football/teams/liverpool"
            target="_blank"
            rel="noopener noreferrer"
            className="text-lfc-red hover:underline"
          >
            BBC Sport
          </a>
          ,{" "}
          <a
            href="https://www.theguardian.com/football/liverpool"
            target="_blank"
            rel="noopener noreferrer"
            className="text-lfc-red hover:underline"
          >
            The Guardian
          </a>
          ,{" "}
          <a
            href="https://bongda.com.vn"
            target="_blank"
            rel="noopener noreferrer"
            className="text-lfc-red hover:underline"
          >
            Bongda.com.vn
          </a>
          ,{" "}
          <a
            href="https://www.24h.com.vn"
            target="_blank"
            rel="noopener noreferrer"
            className="text-lfc-red hover:underline"
          >
            24h.com.vn
          </a>{" "}
          &amp;{" "}
          <a
            href="https://bongdaplus.vn"
            target="_blank"
            rel="noopener noreferrer"
            className="text-lfc-red hover:underline"
          >
            Bongdaplus.vn
          </a>
          . All rights belong to their respective owners.
        </p>
      </div>
    </div>
  );
}
