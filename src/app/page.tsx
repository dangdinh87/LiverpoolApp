import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { getFixtures, getStandings, getGameweekInfo } from "@/lib/football";
import { getNewsFromDB } from "@/lib/news";
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
  let fixtures: Fixture[] = [];
  let standings: Awaited<ReturnType<typeof getStandings>> = [];
  let allNews: Awaited<ReturnType<typeof getNewsFromDB>> = [];
  let gameweek: Awaited<ReturnType<typeof getGameweekInfo>> = null;
  let locale = "en";

  try {
    [fixtures, standings, allNews, gameweek, locale] = await Promise.all([
      getFixtures(),
      getStandings(),
      getNewsFromDB(20),
      getGameweekInfo(),
      getLocale(),
    ]);
  } catch (err) {
    console.error("[homepage] Data fetch error:", err);
  }

  // Show locale-matching articles on home, fallback to all if too few
  const userLang = locale === "vi" ? "vi" : "en";
  const localNews = allNews.filter((a) => a.language === userLang);
  const news = localNews.length >= 3 ? localNews.slice(0, 6) : allNews.slice(0, 6);

  // Earliest upcoming match (sorted by date)
  const nextMatch: Fixture | null =
    [...fixtures]
      .filter((f) => f.fixture.status.short === "NS")
      .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime())[0] ?? null;

  return (
    <>
      <Hero />
      <section className="py-10">
        <BentoGrid nextMatch={nextMatch} standings={standings} gameweek={gameweek} />
      </section>
      <section className="py-10 pb-16">
        <NewsSection articles={news} />
      </section>
    </>
  );
}
