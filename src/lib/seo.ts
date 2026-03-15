import type { Metadata } from "next";

// ─── Constants ──────────────────────────────────────────────────────────────

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const SITE_NAME = "Liverpool FC Việt Nam";

const PUBLISHER = {
  "@type": "Organization" as const,
  name: SITE_NAME,
  url: SITE_URL,
  logo: {
    "@type": "ImageObject" as const,
    url: `${SITE_URL}/assets/lfc/crest.webp`,
  },
};

// ─── Canonical & Hreflang ───────────────────────────────────────────────────

/** Build full canonical URL from a path (e.g. "/squad" → "https://...liverpoolfcvn.blog/squad") */
export function getCanonical(path: string): string {
  // Normalize: ensure leading slash, strip trailing slash (except root)
  const normalized = path === "/" ? "" : path.replace(/\/+$/, "");
  return `${SITE_URL}${normalized}`;
}

/**
 * Generate hreflang alternates for Next.js metadata.
 * Cookie-based i18n → same URL for both locales (correct per Google's guidance).
 */
export function getHreflangAlternates(path: string) {
  const url = getCanonical(path);
  return {
    canonical: url,
    languages: {
      vi: url,
      en: url,
      "x-default": url,
    },
  };
}

// ─── Page Metadata ──────────────────────────────────────────────────────────

export interface PageMetaOptions {
  path?: string;
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
}

/**
 * Standard OG + Twitter card metadata for a page.
 * Enhanced: optionally adds canonical URL, hreflang alternates, OG image, article times.
 * Backward-compatible — existing callers passing (title, desc) still work.
 */
export function makePageMeta(
  title: string,
  description: string,
  options?: PageMetaOptions
): Partial<Metadata> {
  const meta: Partial<Metadata> = {
    openGraph: {
      title,
      description,
      type: options?.type ?? "website",
      siteName: SITE_NAME,
      ...(options?.image && { images: [{ url: options.image }] }),
      ...(options?.publishedTime && {
        publishedTime: options.publishedTime,
      }),
      ...(options?.modifiedTime && {
        modifiedTime: options.modifiedTime,
      }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(options?.image && { images: [options.image] }),
    },
  };

  // Add canonical + hreflang if path provided
  if (options?.path) {
    meta.alternates = getHreflangAlternates(options.path);
  }

  return meta;
}

// ─── JSON-LD Builders ───────────────────────────────────────────────────────

/** BreadcrumbList — for SERP breadcrumb trails */
export function buildBreadcrumbJsonLd(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** NewsArticle — for news carousel / rich result eligibility */
export function buildNewsArticleJsonLd(article: {
  title: string;
  description: string;
  url: string;
  image?: string;
  author?: string;
  publishedAt?: string;
  modifiedAt?: string;
  sourceName?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.description,
    url: article.url,
    ...(article.image && {
      image: [article.image],
    }),
    ...(article.publishedAt && {
      datePublished: article.publishedAt,
    }),
    ...(article.modifiedAt && {
      dateModified: article.modifiedAt,
    }),
    author: {
      "@type": article.sourceName ? "Organization" : "Person",
      name: article.author || article.sourceName || SITE_NAME,
    },
    publisher: PUBLISHER,
  };
}

/** SportsEvent — for match/fixture rich results */
export function buildSportsEventJsonLd(event: {
  name: string;
  startDate: string;
  venue?: string | null;
  venueCity?: string | null;
  homeTeam: string;
  awayTeam: string;
  competition?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  status?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: event.name,
    startDate: event.startDate,
    sport: "Football",
    ...(event.venue && {
      location: {
        "@type": "StadiumOrArena",
        name: event.venue,
        ...(event.venueCity && {
          address: {
            "@type": "PostalAddress",
            addressLocality: event.venueCity,
          },
        }),
      },
    }),
    ...(event.competition && {
      superEvent: {
        "@type": "SportsEvent",
        name: event.competition,
      },
    }),
    competitor: [
      { "@type": "SportsTeam", name: event.homeTeam },
      { "@type": "SportsTeam", name: event.awayTeam },
    ],
    // Include result if match is finished
    ...(event.homeScore != null &&
      event.awayScore != null && {
        result: `${event.homeTeam} ${event.homeScore} - ${event.awayScore} ${event.awayTeam}`,
      }),
  };
}

/** Person — for player knowledge panel association */
export function buildPersonJsonLd(player: {
  name: string;
  birthDate?: string;
  nationality?: string;
  image?: string;
  url: string;
  position?: string;
  shirtNumber?: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: player.name,
    url: player.url,
    ...(player.birthDate && { birthDate: player.birthDate }),
    ...(player.nationality && {
      nationality: {
        "@type": "Country",
        name: player.nationality,
      },
    }),
    ...(player.image && { image: player.image }),
    ...(player.position && { jobTitle: `Football ${player.position}` }),
    memberOf: {
      "@type": "SportsTeam",
      name: "Liverpool FC",
      url: "https://www.liverpoolfc.com",
    },
  };
}

/** ImageGallery — for gallery page */
export function buildImageGalleryJsonLd(
  images: { src: string; alt: string; width?: number; height?: number }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name: `${SITE_NAME} Photo Gallery`,
    url: getCanonical("/gallery"),
    image: images.map((img) => ({
      "@type": "ImageObject",
      contentUrl: img.src,
      name: img.alt,
      ...(img.width && { width: img.width }),
      ...(img.height && { height: img.height }),
    })),
  };
}

/** FAQPage — for FAQ rich result snippets */
export function buildFaqJsonLd(
  items: { question: string; answer: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
