import type { Metadata } from "next";
import { getTopScorers, getTopAssists } from "@/lib/football";
import { StatNumber } from "@/components/stats/stat-number";
import { StatChart } from "@/components/stats/stat-chart";

export const metadata: Metadata = {
  title: "Stats",
  description: "Liverpool FC Premier League statistics 2025/26 — top scorers, assists and more.",
};

export const revalidate = 21600; // 6h

export default async function StatsPage() {
  const [scorers, assists] = await Promise.all([
    getTopScorers(),
    getTopAssists(),
  ]);

  // Liverpool-only stats for headline numbers
  const lfcScorers = scorers.filter((s) => s.statistics[0]?.team?.id === 40);
  const totalLfcGoals = lfcScorers.reduce(
    (sum, s) => sum + (s.statistics[0]?.goals?.total ?? 0),
    0
  );
  const totalLfcAssists = lfcScorers.reduce(
    (sum, s) => sum + (s.statistics[0]?.goals?.assists ?? 0),
    0
  );
  const topScorerGoals = scorers[0]?.statistics[0]?.goals?.total ?? 0;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative h-[40vh] min-h-[320px] flex items-end">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/lfc/fans/fans-anfield.webp')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stadium-bg via-stadium-bg/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-stadium-bg/80 to-transparent" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 w-full">
          <p className="font-barlow text-lfc-red uppercase tracking-widest text-sm font-semibold mb-2">
            Premier League · 2025/26
          </p>
          <h1 className="font-bebas text-7xl md:text-8xl text-white tracking-wider leading-none">
            Statistics
          </h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">
        {/* Headline stats — animated count-up */}
        <div className="grid grid-cols-3 gap-4 mb-16 bg-stadium-surface border border-stadium-border rounded-none p-8">
          <StatNumber
            value={totalLfcGoals}
            label="LFC Goals"
            highlight
          />
          <StatNumber
            value={totalLfcAssists}
            label="LFC Assists"
          />
          <StatNumber
            value={topScorerGoals}
            label="Top Scorer Goals"
            highlight
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Scorers */}
          <div className="bg-stadium-surface border border-stadium-border rounded-none p-6">
            <h2 className="font-bebas text-2xl text-white tracking-wider mb-1">
              Top Scorers
            </h2>
            <p className="font-inter text-xs text-stadium-muted mb-5">
              Premier League 2025/26 · Red = Liverpool player
            </p>
            <StatChart scorers={scorers} type="goals" limit={10} />
          </div>

          {/* Top Assists */}
          <div className="bg-stadium-surface border border-stadium-border rounded-none p-6">
            <h2 className="font-bebas text-2xl text-white tracking-wider mb-1">
              Top Assists
            </h2>
            <p className="font-inter text-xs text-stadium-muted mb-5">
              Premier League 2025/26 · Red = Liverpool player
            </p>
            <StatChart scorers={assists} type="assists" limit={10} />
          </div>
        </div>

        {/* Liverpool top scorers table */}
        {lfcScorers.length > 0 && (
          <div className="mt-8 bg-stadium-surface border border-stadium-border rounded-none overflow-hidden">
            <div className="px-6 py-4 border-b border-stadium-border">
              <h2 className="font-bebas text-2xl text-white tracking-wider">
                Liverpool Scorers
              </h2>
            </div>
            <div className="divide-y divide-stadium-border/50">
              {lfcScorers.map((s, i) => {
                const stat = s.statistics[0];
                return (
                  <div key={s.player.id} className="flex items-center gap-4 px-6 py-3">
                    <span className="font-bebas text-xl text-stadium-muted w-6">{i + 1}</span>
                    <span className="font-inter text-sm text-white font-medium flex-1">
                      {s.player.name}
                    </span>
                    <div className="flex gap-6 text-center">
                      <div>
                        <p className="font-bebas text-xl text-lfc-red">
                          {stat?.goals?.total ?? 0}
                        </p>
                        <p className="font-barlow text-xs text-stadium-muted uppercase">G</p>
                      </div>
                      <div>
                        <p className="font-bebas text-xl text-white">
                          {stat?.goals?.assists ?? 0}
                        </p>
                        <p className="font-barlow text-xs text-stadium-muted uppercase">A</p>
                      </div>
                      <div>
                        <p className="font-bebas text-xl text-white">
                          {stat?.games?.appearences ?? 0}
                        </p>
                        <p className="font-barlow text-xs text-stadium-muted uppercase">Apps</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
