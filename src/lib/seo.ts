import type { Metadata } from "next";
import { BRAND } from "./brand";
import { routing, withLocalePrefix } from "@/i18n/routing";

// ─── Constants ──────────────────────────────────────────────────────────────

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const SITE_NAME = BRAND.name;

/**
 * Host of the site's own canonical URL, e.g. `www.example.com`.
 *
 * Lets a link be classified as internal without naming a domain in the code.
 * The chat renderer used to hardcode `liverpoolfcvn.blog`, which would quietly
 * start opening the site's own links in a new tab the day the domain changes —
 * and that rename is already planned.
 */
export const SITE_HOST = (() => {
  try {
    return new URL(SITE_URL).host;
  } catch {
    return "";
  }
})();


/**
 * Site-wide share image: the generated 1200×630 card at app/opengraph-image.tsx.
 * Pages without their own image must still name it — a page's `openGraph`
 * object replaces the root layout's, so leaving `images` out removed the
 * preview from every page built with makePageMeta.
 */
export const DEFAULT_OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: SITE_NAME,
};

/**
 * `@id`s of the site-wide entities declared once in <StructuredData />.
 * Page-level schema refers to these instead of restating them, so the
 * publisher, website and club are each one node in the graph, not several.
 */
export const SCHEMA_IDS = {
  publisher: `${SITE_URL}/#publisher`,
  website: `${SITE_URL}/#website`,
  club: `${SITE_URL}/#club`,
};

const PUBLISHER = {
  "@type": "Organization" as const,
  "@id": SCHEMA_IDS.publisher,
  name: SITE_NAME,
  url: SITE_URL,
  logo: {
    "@type": "ImageObject" as const,
    url: `${SITE_URL}${BRAND.assets.icon512}`,
  },
};

/** OpenGraph wants a language_TERRITORY code, not a bare locale. */
/**
 * Site-level keywords, per locale.
 *
 * These used to be one fixed list, mostly Vietnamese ("fan Liverpool Việt Nam",
 * "giờ đá Liverpool", "Ngoại hạng Anh"), served to English readers as well. The
 * English set is not a translation of the Vietnamese one: each is the wording
 * that readers in that language actually search for, and neither names a
 * country, because the site is for supporters anywhere.
 */
const KEYWORDS: Record<string, string[]> = {
  en: [
    "Liverpool FC", "LFC", "The Reds", "The Kop", "Anfield", "YNWA",
    "Liverpool kick-off time", "Liverpool fixtures", "Liverpool results", "Liverpool squad",
    "Premier League table", "Liverpool news", "Liverpool transfers",
    "Premier League", "where to watch Liverpool", "You'll Never Walk Alone",
  ],
  vi: [
    "Liverpool FC", "LFC", "The Reds", "The Kop", "Anfield", "YNWA",
    "giờ đá Liverpool", "lịch thi đấu Liverpool", "kết quả Liverpool", "đội hình Liverpool",
    "bảng xếp hạng Ngoại hạng Anh", "tin Liverpool", "chuyển nhượng Liverpool",
    "Premier League", "Ngoại hạng Anh", "xem Liverpool ở đâu", "You'll Never Walk Alone",
  ],
};

/** Keywords for `locale`, falling back to the default locale's set. */
export function keywordsFor(locale: string): string[] {
  return KEYWORDS[locale] ?? KEYWORDS[routing.defaultLocale];
}

const OG_LOCALES: Record<string, string> = { en: "en_GB", vi: "vi_VN" };
const ogLocale = (locale: string) => OG_LOCALES[locale] ?? OG_LOCALES[routing.defaultLocale];

// ─── Canonical & Hreflang ───────────────────────────────────────────────────

/** Build full canonical URL from a path (e.g. "/squad" → `${SITE_URL}/squad`). */
export function getCanonical(path: string): string {
  // Normalize: ensure leading slash, strip trailing slash (except root)
  const normalized = path === "/" ? "" : path.replace(/\/+$/, "");
  return `${SITE_URL}${normalized}`;
}

/**
 * Absolute URL of `path` as served in `locale`, e.g. ("/squad", "vi") → `${SITE_URL}/vi/squad`.
 *
 * Use this, not getCanonical, for any URL written into a localized page
 * (JSON-LD `url`, breadcrumb items): getCanonical knows nothing about locales,
 * so every Vietnamese page's structured data used to point at the English one.
 * Which locale carries a prefix comes from the routing config, never a literal.
 */
export function getLocalizedUrl(
  path: string,
  locale: string = routing.defaultLocale,
): string {
  return getCanonical(withLocalePrefix(path, locale));
}

/**
 * Generate canonical + hreflang alternates for Next.js metadata.
 *
 * Each locale must point at its OWN URL. This used to return one URL for every
 * language, which was right while locales were chosen by cookie on a single
 * URL — but the site now serves English under /en, so that left every English
 * page declaring the Vietnamese page as its canonical (telling search engines
 * to drop the English version) and gave Google no way to discover /en at all.
 *
 * @param path    Unprefixed path, e.g. "/squad".
 * @param locale  Locale the page is being rendered for; decides the canonical.
 * @param written Locales the page really exists in. Defaults to all of them;
 *                pass fewer for content written in only some languages (the
 *                site's own articles), so a locale serving another language's
 *                text is not advertised as a translation.
 */
export function getHreflangAlternates(
  path: string,
  locale: string = routing.defaultLocale,
  written: readonly string[] = routing.locales,
) {
  const available: readonly string[] = routing.locales.filter((l) => written.includes(l));
  const languages = Object.fromEntries(
    available.map((l) => [l, getLocalizedUrl(path, l)]),
  ) as Partial<Record<(typeof routing.locales)[number], string>>;
  const fallback = available.includes(routing.defaultLocale)
    ? routing.defaultLocale
    : (available[0] ?? routing.defaultLocale);

  return {
    // A locale without its own version canonicalises to one that has it.
    canonical: getLocalizedUrl(path, available.includes(locale) ? locale : fallback),
    languages: {
      ...languages,
      // The default locale is what an unmatched visitor gets.
      "x-default": getLocalizedUrl(path, fallback),
    },
  };
}

// ─── Page Metadata ──────────────────────────────────────────────────────────

export interface PageMetaOptions {
  path?: string;
  /** Locale the page renders for; decides canonical and OG locale. */
  locale?: string;
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
      locale: ogLocale(options?.locale ?? routing.defaultLocale),
      alternateLocale: routing.locales
        .filter((l) => l !== (options?.locale ?? routing.defaultLocale))
        .map(ogLocale),
      ...(options?.path && {
        url: getLocalizedUrl(options.path, options?.locale),
      }),
      images: options?.image ? [{ url: options.image }] : [DEFAULT_OG_IMAGE],
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
      images: [options?.image ?? DEFAULT_OG_IMAGE.url],
    },
  };

  // Add canonical + hreflang if path provided
  if (options?.path) {
    meta.alternates = getHreflangAlternates(options.path, options.locale);
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
  inLanguage?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.description,
    url: article.url,
    mainEntityOfPage: article.url,
    ...(article.inLanguage && { inLanguage: article.inLanguage }),
    ...(article.image && {
      image: [article.image],
    }),
    ...(article.publishedAt && {
      datePublished: article.publishedAt,
    }),
    // Google asks for both dates; without one it assumes the story was never updated.
    ...((article.modifiedAt || article.publishedAt) && {
      dateModified: article.modifiedAt ?? article.publishedAt,
    }),
    author: {
      "@type": article.sourceName ? "Organization" : "Person",
      name: article.author || article.sourceName || SITE_NAME,
    },
    publisher: PUBLISHER,
  };
}

/** Fixture status codes that change a match's schema.org eventStatus; anything else is scheduled. */
const EVENT_STATUS: Record<string, string> = {
  PST: "EventPostponed",
  CANC: "EventCancelled",
  ABD: "EventCancelled",
};

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
  /** The match page's own (localized) URL. */
  url?: string;
}) {
  const home = { "@type": "SportsTeam", name: event.homeTeam };
  const away = { "@type": "SportsTeam", name: event.awayTeam };
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: event.name,
    ...(event.url && { url: event.url }),
    startDate: event.startDate,
    eventStatus: `https://schema.org/${EVENT_STATUS[event.status ?? ""] ?? "EventScheduled"}`,
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
    homeTeam: home,
    awayTeam: away,
    competitor: [home, away],
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
  images: { src: string; alt: string; width?: number; height?: number }[],
  locale: string = routing.defaultLocale,
) {
  return {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name: `${SITE_NAME} Photo Gallery`,
    url: getLocalizedUrl("/gallery", locale),
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
