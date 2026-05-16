const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Liverpool FC Việt Nam",
    alternateName: ["Liverpool FC VN", "LFC Việt Nam", "Liverpool FC Fan Site"],
    url: SITE_URL,
    description: "Trang fan Liverpool FC Việt Nam — Tin tức, đội hình, lịch thi đấu, bảng xếp hạng Ngoại hạng Anh và lịch sử CLB.",
    inLanguage: ["vi", "en"],
    publisher: {
      "@type": "Organization",
      name: "Liverpool FC Việt Nam Fan Site",
      logo: `${SITE_URL}/assets/lfc/crest.webp`,
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
    logo: `${SITE_URL}/assets/lfc/crest.webp`,
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Liverpool FC Việt Nam Fan Site",
    url: SITE_URL,
    logo: `${SITE_URL}/assets/lfc/crest.webp`,
    sameAs: [
      "https://www.facebook.com/LiverpoolFC",
      "https://twitter.com/LFC",
      "https://www.instagram.com/liverpoolfc",
      "https://www.youtube.com/liverpoolfc",
    ],
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
