import { BRAND, brandDescription } from "@/lib/brand";
import { getEnv } from "@/lib/env";
import { routing } from "@/i18n/routing";
import { SCHEMA_IDS } from "@/lib/seo";

/**
 * Site-level structured data, as one linked graph.
 *
 * This used to be three disconnected top-level entities with no `@id` between
 * them: a WebSite, an Organization repeating the WebSite's own publisher, and a
 * bare SportsTeam describing Liverpool FC and pointing at liverpoolfc.com. A
 * free-standing SportsTeam on an unofficial fan site reads as a claim to be the
 * club rather than a statement about it, and it earned nothing in return
 * because nothing referred to it.
 *
 * Now there is one publisher entity, referenced by `@id` where it is needed,
 * and the club is attached through `about` — "this site is about Liverpool FC",
 * which is both true and the relationship search engines can actually use.
 *
 * `sameAs` still names no club profile: linking the club's official accounts
 * from our own Organization would assert they are ours.
 */
// One language has to be chosen for a document served at a single URL; the
// alternates are declared per page. It follows the default locale rather than
// being pinned to Vietnamese, which is what it was while the site was LFCVN.
const DEFAULT_LOCALE = routing.defaultLocale;

function buildSiteJsonLd() {
  const siteUrl = (
    getEnv("NEXT_PUBLIC_SITE_URL") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  ).replace(/\/+$/, "");
  const publisherId = SCHEMA_IDS.publisher;
  const clubId = SCHEMA_IDS.club;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": publisherId,
        name: BRAND.name,
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}${BRAND.assets.icon512}`,
          width: 512,
          height: 512,
        },
        description: brandDescription(DEFAULT_LOCALE),
      },
      {
        "@type": "WebSite",
        "@id": SCHEMA_IDS.website,
        name: BRAND.name,
        // Google's site-name system reads name + alternateName; without a fallback it shows the domain.
        alternateName: BRAND.name.replace(/\s+/g, ""),
        url: siteUrl,
        description: brandDescription(DEFAULT_LOCALE),
        inLanguage: [...routing.locales],
        publisher: { "@id": publisherId },
        // States the subject rather than claiming the identity.
        about: { "@id": clubId },
      },
      {
        "@type": "SportsTeam",
        "@id": clubId,
        name: "Liverpool FC",
        alternateName: ["Liverpool", "LFC", "The Reds"],
        url: "https://www.liverpoolfc.com",
        sport: "Association football",
        memberOf: { "@type": "SportsOrganization", name: "Premier League" },
        location: {
          "@type": "StadiumOrArena",
          name: "Anfield",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Liverpool",
            addressCountry: "GB",
          },
        },
      },
    ],
  };
}

export function StructuredData() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(buildSiteJsonLd()) }}
    />
  );
}
