import type { Metadata } from "next";
import { getFixtures, getStandings } from "@/lib/football";
import { getNewsFromDB } from "@/lib/news";
import { getLatestDigest } from "@/lib/news/digest";
import { Hero } from "@/components/home/hero";
import { BentoGrid } from "@/components/home/bento-grid";
import { NewsSection } from "@/components/home/news-section";
import { LiveMatchBanner } from "@/components/home/live-match-banner";
import { makePageMeta } from "@/lib/seo";
import type { Fixture } from "@/lib/types/football";

export const metadata: Metadata = {
  title: "Liverpool FC Việt Nam — Tin tức, Lịch thi đấu, Đội hình | YNWA",
  description:
    "Trang fan Liverpool FC Việt Nam — Tin tức mới nhất, đội hình, lịch thi đấu, bảng xếp hạng Ngoại hạng Anh, thống kê và lịch sử CLB Liverpool.",
  ...makePageMeta(
    "Liverpool FC Việt Nam — Tin tức, Lịch thi đấu, Đội hình | YNWA",
    "Trang fan Liverpool FC Việt Nam — Tin tức mới nhất, đội hình, lịch thi đấu, bảng xếp hạng Ngoại hạng Anh, thống kê và lịch sử CLB Liverpool.",
  ),
};

// Always fetch fresh data on each visit (no ISR cache)
export const dynamic = "force-dynamic";

export default async function HomePage() {
  let fixtures: Fixture[] = [];
  let standings: Awaited<ReturnType<typeof getStandings>> = [];
  let allNews: Awaited<ReturnType<typeof getNewsFromDB>> = [];
  let digest: Awaited<ReturnType<typeof getLatestDigest>> = null;
  try {
    [fixtures, standings, allNews, digest] = await Promise.all([
      getFixtures(),
      getStandings(),
      getNewsFromDB(40),
      getLatestDigest(),
    ]);
  } catch (err) {
    console.error("[homepage] Data fetch error:", err);
  }

  // Live match takes priority, otherwise earliest upcoming
  const LIVE = new Set(["1H", "HT", "2H", "ET", "P", "BT", "LIVE"]);
  const liveMatch = fixtures.find(
    (f) => LIVE.has(f.fixture.status.short) && (f.teams.home.id === 40 || f.teams.away.id === 40)
  ) ?? null;

  const nextMatch: Fixture | null =
    liveMatch ??
    [...fixtures]
      .filter((f) => f.fixture.status.short === "NS")
      .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime())[0] ?? null;

  return (
    <>
      <LiveMatchBanner fixtures={fixtures} />
      <Hero />
      <section className="py-10 pb-16">
        <NewsSection articles={allNews} digest={digest} />
      </section>
      <section className="py-10">
        <BentoGrid nextMatch={nextMatch} standings={standings} />
      </section>
    </>
  );
}
