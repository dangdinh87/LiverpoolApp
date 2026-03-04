import type { Metadata } from "next";
import { getFixtures, getStandings } from "@/lib/football";
import { getNews } from "@/lib/rss-parser";
import { Hero } from "@/components/home/hero";
import { BentoGrid } from "@/components/home/bento-grid";
import { NewsSection } from "@/components/home/news-section";
import type { Fixture } from "@/lib/types/football";

export const metadata: Metadata = {
  title: "Liverpool FC — You'll Never Walk Alone",
  description:
    "The home of Liverpool FC — live results, squad, fixtures, Premier League standings and more.",
};

// Driven by news feed (shortest TTL)
export const revalidate = 1800; // 30min

export default async function HomePage() {
  const [fixtures, standings, news] = await Promise.all([
    getFixtures(),
    getStandings(),
    getNews(6),
  ]);

  // First upcoming match
  const nextMatch: Fixture | null =
    fixtures.find((f) => f.fixture.status.short === "NS") ?? null;

  return (
    <>
      {/* Section 1: Hero — full viewport */}
      <Hero />

      {/* Section 2: Overview */}
      <div className="min-h-screen flex items-center snap-start">
        <BentoGrid nextMatch={nextMatch} standings={standings} />
      </div>

      {/* Section 3: News */}
      <div className="min-h-screen flex items-start pt-20 snap-start">
        <NewsSection articles={news} />
      </div>
    </>
  );
}
