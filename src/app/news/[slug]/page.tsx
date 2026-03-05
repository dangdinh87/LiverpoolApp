import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Clock, Newspaper } from "lucide-react";
import { scrapeArticle } from "@/lib/article-scraper";
import { SOURCE_CONFIG, formatRelativeDate, type NewsSource } from "@/lib/news-config";
import { notFound } from "next/navigation";

// ISR: cache scraped articles for 1 hour
export const revalidate = 3600;

// Decode slug → original article URL
function decodeSlug(slug: string): string | null {
  try {
    // Base64url → base64 → decode
    const base64 = slug.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch {
    return null;
  }
}

// Detect source from URL
function detectSource(url: string): NewsSource {
  if (url.includes("liverpoolfc.com")) return "lfc";
  if (url.includes("bbc.com") || url.includes("bbc.co.uk")) return "bbc";
  if (url.includes("theguardian.com")) return "guardian";
  if (url.includes("bongda.com.vn")) return "bongda";
  if (url.includes("24h.com.vn")) return "24h";
  if (url.includes("bongdaplus.vn")) return "bongdaplus";
  return "bbc";
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const url = decodeSlug(slug);
  if (!url) return { title: "Article Not Found" };

  const content = await scrapeArticle(url);
  if (!content) return { title: "Article Not Found" };

  return {
    title: content.title,
    description: content.description || content.paragraphs[0]?.slice(0, 160),
    openGraph: {
      title: content.title,
      description: content.description,
      images: content.heroImage ? [content.heroImage] : [],
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const url = decodeSlug(slug);
  if (!url) notFound();

  const content = await scrapeArticle(url);
  if (!content || content.paragraphs.length === 0) {
    // Can't scrape → redirect to original
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <Newspaper className="w-16 h-16 text-stadium-muted mb-6" />
        <h1 className="font-bebas text-4xl text-white mb-3">
          Content Unavailable
        </h1>
        <p className="font-inter text-stadium-muted text-sm mb-6 text-center max-w-md">
          This article couldn&apos;t be loaded for in-app reading. You can read
          it on the original site.
        </p>
        <div className="flex gap-3">
          <Link
            href="/news"
            className="font-barlow text-sm text-white bg-stadium-surface border border-stadium-border px-4 py-2 hover:border-lfc-red/40 transition-colors"
          >
            ← Back to News
          </Link>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-barlow text-sm text-white bg-lfc-red px-4 py-2 hover:bg-lfc-red/80 transition-colors flex items-center gap-2"
          >
            Read Original <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  const source = detectSource(url);
  const cfg = SOURCE_CONFIG[source];

  return (
    <div className="min-h-screen">
      {/* Hero Image */}
      {content.heroImage && (
        <div className="relative w-full h-[40vh] min-h-[300px]">
          <Image
            src={content.heroImage}
            alt={content.title}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stadium-bg via-stadium-bg/50 to-transparent" />
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Back link */}
        <div className={content.heroImage ? "-mt-20 relative z-10" : "pt-24"}>
          <Link
            href="/news"
            className="inline-flex items-center gap-1.5 font-barlow text-sm text-stadium-muted hover:text-lfc-red transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to News
          </Link>

          {/* Source badge */}
          <div className="flex items-center gap-2 mb-4">
            <span
              className={`inline-flex items-center gap-1 font-barlow text-xs uppercase tracking-wider px-2 py-1 rounded-sm ${cfg.color}`}
            >
              {cfg.label}
            </span>
            <span className="text-stadium-border">·</span>
            <span className="font-inter text-xs text-stadium-muted flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {content.sourceName}
            </span>
          </div>

          {/* Title */}
          <h1 className="font-inter text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight mb-6">
            {content.title}
          </h1>

          {/* Description */}
          {content.description && (
            <p className="font-inter text-lg text-stadium-muted leading-relaxed mb-8 border-l-2 border-lfc-red pl-4">
              {content.description}
            </p>
          )}
        </div>

        {/* Article Body */}
        <div className="prose-stadium">
          {content.paragraphs.map((p, i) => (
            <p
              key={i}
              className="font-inter text-base text-white/85 leading-relaxed mb-4"
            >
              {p}
            </p>
          ))}

          {/* Inline article images */}
          {content.images.length > 1 && (
            <div className="my-8 space-y-4">
              {content.images.slice(1, 4).map((img, i) => (
                <div key={i} className="relative w-full aspect-video rounded-sm overflow-hidden">
                  <Image
                    src={img}
                    alt={`Article image ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 720px"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-stadium-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="font-inter text-xs text-stadium-muted">
            Content sourced from{" "}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lfc-red hover:underline"
            >
              {content.sourceName}
            </a>
            . All rights belong to the original publisher.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-barlow text-sm text-lfc-red hover:underline uppercase tracking-wider"
          >
            Read Original <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
