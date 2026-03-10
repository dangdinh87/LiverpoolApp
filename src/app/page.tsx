import type { Metadata } from "next";
import { getFixtures, getStandings } from "@/lib/football";
import { getNewsFromDB } from "@/lib/news";
import { Hero } from "@/components/home/hero";
import { BentoGrid } from "@/components/home/bento-grid";
import { NewsSection } from "@/components/home/news-section";
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

// ISR: revalidate every 30 min (no cookies() call — locale filtering moved to client)
export const revalidate = 1800;

export default async function HomePage() {
  let fixtures: Fixture[] = [];
  let standings: Awaited<ReturnType<typeof getStandings>> = [];
  let allNews: Awaited<ReturnType<typeof getNewsFromDB>> = [];
  try {
    [fixtures, standings, allNews] = await Promise.all([
      getFixtures(),
      getStandings(),
      getNewsFromDB(20),
    ]);
  } catch (err) {
    console.error("[homepage] Data fetch error:", err);
  }

  // Earliest upcoming match (sorted by date)
  const nextMatch: Fixture | null =
    [...fixtures]
      .filter((f) => f.fixture.status.short === "NS")
      .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime())[0] ?? null;

  return (
    <>
      <Hero />
      <section className="py-10">
        <BentoGrid nextMatch={nextMatch} standings={standings} />
      </section>
      <section className="py-10 pb-16">
        <NewsSection articles={allNews.slice(0, 12)} />
      </section>
    </>
  );
}
