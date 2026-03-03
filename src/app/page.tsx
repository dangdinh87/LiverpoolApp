import type { Metadata } from "next";
import { getFixtures, getStandings, getSquad } from "@/lib/api-football";
import { getNews } from "@/lib/rss-parser";
import { Hero } from "@/components/home/hero";
import { BentoGrid } from "@/components/home/bento-grid";
import type { Fixture } from "@/lib/types/football";

export const metadata: Metadata = {
  title: "Liverpool FC — You'll Never Walk Alone",
  description:
    "The home of Liverpool FC — live results, squad, fixtures, Premier League standings and more.",
};

// Driven by news feed (shortest TTL)
export const revalidate = 1800; // 30min

export default async function HomePage() {
  const [fixtures, standings, squad, news] = await Promise.all([
    getFixtures(),
    getStandings(),
    getSquad(),
    getNews(6),
  ]);

  // First upcoming match
  const nextMatch: Fixture | null =
    fixtures.find((f) => f.fixture.status.short === "NS") ?? null;

  return (
    <main>
      <Hero />
      <BentoGrid
        nextMatch={nextMatch}
        standings={standings}
        players={squad}
        news={news}
      />
    </main>
  );
}
