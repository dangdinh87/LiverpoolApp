import { BRAND } from "@/lib/brand";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// The site is an unofficial fan hub: its own entity carries our mark and no
// official club profiles (sameAs would claim they are ours). The club appears
// only as the subject of the SportsTeam entity.
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND.name,
    alternateName: ["Fan Liverpool Việt Nam", "LFC Việt Nam"],
    url: SITE_URL,
    description: BRAND.description.vi,
    inLanguage: ["vi", "en"],
    publisher: {
      "@type": "Organization",
      name: BRAND.name,
      logo: `${SITE_URL}${BRAND.assets.icon512}`,
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: "Liverpool FC",
    alternateName: ["Liverpool", "LFC", "The Reds"],
    url: "https://www.liverpoolfc.com",
    sport: "Football",
    league: "Premier League",
    location: {
      "@type": "StadiumOrArena",
      name: "Anfield",
      address: { "@type": "PostalAddress", addressLocality: "Liverpool", addressCountry: "GB" },
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND.name,
    url: SITE_URL,
    logo: `${SITE_URL}${BRAND.assets.icon512}`,
  },
];

export function StructuredData() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
