import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Clock } from "lucide-react";
import { getNews } from "@/lib/rss-parser";

export const metadata: Metadata = {
  title: "News",
  description: "Latest Liverpool FC news from BBC Sport.",
};

// ISR: revalidate every 30 minutes
export const revalidate = 1800;

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

export default async function NewsPage() {
  const articles = await getNews(20);

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <p className="font-barlow text-lfc-red uppercase tracking-widest text-sm font-semibold mb-2">
            BBC Sport
          </p>
          <h1 className="font-bebas text-6xl md:text-7xl text-white tracking-wider leading-none mb-3">
            Latest News
          </h1>
          <p className="text-stadium-muted font-inter text-sm">
            Liverpool FC news powered by BBC Sport RSS feed
          </p>
        </div>

        {articles.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-bebas text-3xl text-stadium-muted mb-2">News Unavailable</p>
            <p className="font-inter text-stadium-muted text-sm">
              Unable to load the news feed. Please try again later.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Featured article */}
            {articles[0] && (
              <a
                href={articles[0].link}
                target="_blank"
                rel="noopener noreferrer"
                className="md:col-span-2 group block"
              >
                <div className="bg-stadium-surface border border-stadium-border rounded-2xl p-6 hover:border-lfc-red/40 transition-all duration-300 hover:bg-stadium-surface2">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-barlow text-xs text-lfc-red uppercase tracking-wider font-semibold">
                      Featured
                    </span>
                    <span className="text-stadium-border">·</span>
                    <span className="font-inter text-xs text-stadium-muted flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeDate(articles[0].pubDate)}
                    </span>
                  </div>
                  <h2 className="font-inter text-xl font-semibold text-white group-hover:text-lfc-red transition-colors mb-3 leading-snug">
                    {articles[0].title}
                  </h2>
                  {articles[0].contentSnippet && (
                    <p className="font-inter text-sm text-stadium-muted leading-relaxed line-clamp-3">
                      {articles[0].contentSnippet}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-4 text-lfc-red font-inter text-sm font-medium">
                    Read article
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                </div>
              </a>
            )}

            {/* Remaining articles */}
            {articles.slice(1).map((article, i) => (
              <a
                key={i}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
              >
                <div className="bg-stadium-surface border border-stadium-border rounded-xl p-5 h-full hover:border-lfc-red/40 transition-all duration-300 hover:bg-stadium-surface2 flex flex-col">
                  <div className="flex items-center gap-1 mb-2 text-stadium-muted">
                    <Clock className="w-3 h-3" />
                    <span className="font-inter text-xs">
                      {formatRelativeDate(article.pubDate)}
                    </span>
                  </div>
                  <h3 className="font-inter text-sm font-semibold text-white group-hover:text-lfc-red transition-colors leading-snug mb-2 flex-1 line-clamp-3">
                    {article.title}
                  </h3>
                  {article.contentSnippet && (
                    <p className="font-inter text-xs text-stadium-muted line-clamp-2 mb-3">
                      {article.contentSnippet.slice(0, 120)}
                      {article.contentSnippet.length > 120 ? "…" : ""}
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-lfc-red font-inter text-xs font-medium mt-auto">
                    Read more
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Attribution */}
        <p className="text-center text-stadium-muted font-inter text-xs mt-10">
          News content sourced from{" "}
          <a
            href="https://www.bbc.co.uk/sport/football/teams/liverpool"
            target="_blank"
            rel="noopener noreferrer"
            className="text-lfc-red hover:underline"
          >
            BBC Sport
          </a>
          . All rights reserved.
        </p>
      </div>
    </div>
  );
}
