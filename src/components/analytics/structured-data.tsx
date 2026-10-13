import { BRAND, brandDescription } from "@/lib/brand";
import { routing } from "@/i18n/routing";
import { SCHEMA_IDS } from "@/lib/seo";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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
// Shared with page-level schema, which refers to these nodes by @id.
const PUBLISHER_ID = SCHEMA_IDS.publisher;
const CLUB_ID = SCHEMA_IDS.club;

// One language has to be chosen for a document served at a single URL; the
// alternates are declared per page. It follows the default locale rather than
// being pinned to Vietnamese, which is what it was while the site was LFCVN.
const DEFAULT_LOCALE = routing.defaultLocale;

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": PUBLISHER_ID,
      name: BRAND.name,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}${BRAND.assets.icon512}`,
        width: 512,
        height: 512,
      },
      description: brandDescription(DEFAULT_LOCALE),
    },
    {
      "@type": "WebSite",
      "@id": SCHEMA_IDS.website,
      name: BRAND.name,
      url: SITE_URL,
      description: brandDescription(DEFAULT_LOCALE),
      inLanguage: [...routing.locales],
      publisher: { "@id": PUBLISHER_ID },
      // States the subject rather than claiming the identity.
      about: { "@id": CLUB_ID },
    },
    {
      "@type": "SportsTeam",
      "@id": CLUB_ID,
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

export function StructuredData() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
