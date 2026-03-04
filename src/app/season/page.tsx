import type { Metadata } from "next";
import {
  getFixtures,
  getStandings,
  getTopScorers,
  getTopAssists,
} from "@/lib/football";
import { FixtureTimeline } from "@/components/fixtures/fixture-timeline";
import { StandingsTable } from "@/components/standings/standings-table";
import { StatNumber } from "@/components/stats/stat-number";
import { StatChart } from "@/components/stats/stat-chart";
import { SeasonTabs } from "@/components/season/season-tabs";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "2024/25 Season",
  description:
    "Liverpool FC Premier League 2024/25 — fixtures, results, standings, and statistics.",
};

// Use shortest revalidation (fixtures = 1h); individual fetches have own cache TTLs
export const revalidate = 3600;

const FORM_COLORS: Record<string, string> = {
  W: "bg-green-500",
  D: "bg-yellow-500",
  L: "bg-red-500",
};

function ordinal(n: number) {
  if (n === 1) return "st";
  if (n === 2) return "nd";
  if (n === 3) return "rd";
  return "th";
}

export default async function SeasonPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;

  /* ── Parallel data fetch ── */
  const [fixtures, standings, scorers, assists] = await Promise.all([
    getFixtures(),
    getStandings(),
    getTopScorers(),
    getTopAssists(),
  ]);

  /* ── Derived data ── */
  const lfcStanding = standings.find((s) => s.team.id === 40);
  const form = lfcStanding?.form?.split("").slice(-5) ?? [];

  const lfcScorers = scorers.filter(
    (s) => s.statistics[0]?.team?.id === 40
  );
  const totalLfcGoals = lfcScorers.reduce(
    (sum, s) => sum + (s.statistics[0]?.goals?.total ?? 0),
    0
  );
  const totalLfcAssists = lfcScorers.reduce(
    (sum, s) => sum + (s.statistics[0]?.goals?.assists ?? 0),
    0
  );
  const topScorerGoals = scorers[0]?.statistics[0]?.goals?.total ?? 0;

  // Next upcoming match
  const nextMatch = [...fixtures]
    .filter((f) => f.fixture.status.short === "NS")
    .sort(
      (a, b) =>
        new Date(a.fixture.date).getTime() -
        new Date(b.fixture.date).getTime()
    )[0];

  /* ── Tab panels (pre-rendered as RSC) ── */
  const fixturesPanel = <FixtureTimeline fixtures={fixtures} />;
  const standingsPanel = <StandingsTable standings={standings} />;
  const statsPanel = (
    <>
      {/* Headline count-up stats */}
      <div className="grid grid-cols-3 gap-4 mb-12 bg-stadium-surface border border-stadium-border p-6 md:p-8">
        <StatNumber value={totalLfcGoals} label="LFC Goals" highlight />
        <StatNumber value={totalLfcAssists} label="LFC Assists" />
        <StatNumber value={topScorerGoals} label="Top Scorer" highlight />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-stadium-surface border border-stadium-border p-6">
          <h2 className="font-bebas text-2xl text-white tracking-wider mb-1">
            Top Scorers
          </h2>
          <p className="font-inter text-xs text-stadium-muted mb-5">
            Premier League 2024/25 · Red = Liverpool player
          </p>
          <StatChart scorers={scorers} type="goals" limit={10} />
        </div>
        <div className="bg-stadium-surface border border-stadium-border p-6">
          <h2 className="font-bebas text-2xl text-white tracking-wider mb-1">
            Top Assists
          </h2>
          <p className="font-inter text-xs text-stadium-muted mb-5">
            Premier League 2024/25 · Red = Liverpool player
          </p>
          <StatChart scorers={assists} type="assists" limit={10} />
        </div>
      </div>

      {/* Liverpool scorers table */}
      {lfcScorers.length > 0 && (
        <div className="mt-8 bg-stadium-surface border border-stadium-border overflow-hidden">
          <div className="px-6 py-4 border-b border-stadium-border">
            <h2 className="font-bebas text-2xl text-white tracking-wider">
              Liverpool Scorers
            </h2>
          </div>
          <div className="divide-y divide-stadium-border/50">
            {lfcScorers.map((s, i) => {
              const stat = s.statistics[0];
              return (
                <div
                  key={s.player.id}
                  className="flex items-center gap-4 px-6 py-3"
                >
                  <span className="font-bebas text-xl text-stadium-muted w-6">
                    {i + 1}
                  </span>
                  <span className="font-inter text-sm text-white font-medium flex-1">
                    {s.player.name}
                  </span>
                  <div className="flex gap-6 text-center">
                    <div>
                      <p className="font-bebas text-xl text-lfc-red">
                        {stat?.goals?.total ?? 0}
                      </p>
                      <p className="font-barlow text-xs text-stadium-muted uppercase">
                        G
                      </p>
                    </div>
                    <div>
                      <p className="font-bebas text-xl text-white">
                        {stat?.goals?.assists ?? 0}
                      </p>
                      <p className="font-barlow text-xs text-stadium-muted uppercase">
                        A
                      </p>
                    </div>
                    <div>
                      <p className="font-bebas text-xl text-white">
                        {stat?.games?.appearences ?? 0}
                      </p>
                      <p className="font-barlow text-xs text-stadium-muted uppercase">
                        Apps
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen">
      {/* ── Compact hero ── */}
      <div className="relative h-[260px] flex items-end">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('/assets/lfc/stadium/anfield-champions-league.webp')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stadium-bg via-stadium-bg/80 to-stadium-bg/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-stadium-bg/60 to-transparent" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 w-full">
          <p className="font-barlow text-lfc-red uppercase tracking-widest text-sm font-semibold mb-2">
            Premier League · 2024/25
          </p>
          <h1 className="font-bebas text-6xl md:text-7xl text-white tracking-wider leading-none mb-4">
            Season
          </h1>

          {/* Quick-glance stat chips */}
          <div className="flex items-center gap-3 flex-wrap">
            {lfcStanding && (
              <>
                <div className="flex items-center gap-2 bg-lfc-red/15 border border-lfc-red/25 px-3 py-1.5">
                  <span className="font-bebas text-xl text-lfc-red leading-none">
                    {lfcStanding.rank}
                    <sup className="text-[10px]">
                      {ordinal(lfcStanding.rank)}
                    </sup>
                  </span>
                  <span className="font-barlow text-[10px] uppercase tracking-wider text-stadium-muted">
                    Position
                  </span>
                </div>

                <div className="flex items-center gap-2 bg-stadium-surface/80 border border-stadium-border px-3 py-1.5">
                  <span className="font-bebas text-xl text-white leading-none">
                    {lfcStanding.points}
                  </span>
                  <span className="font-barlow text-[10px] uppercase tracking-wider text-stadium-muted">
                    Points
                  </span>
                </div>

                {form.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-stadium-surface/80 border border-stadium-border px-3 py-2">
                    {form.map((r, i) => (
                      <span
                        key={i}
                        className={cn(
                          "w-2 h-2 rounded-full",
                          FORM_COLORS[r] ?? "bg-stadium-muted"
                        )}
                      />
                    ))}
                    <span className="font-barlow text-[10px] uppercase tracking-wider text-stadium-muted ml-1">
                      Form
                    </span>
                  </div>
                )}
              </>
            )}

            {nextMatch && (
              <div className="flex items-center gap-2 bg-stadium-surface/80 border border-stadium-border px-3 py-1.5">
                <span className="font-inter text-xs text-white">
                  Next:{" "}
                  {nextMatch.teams.home.id === 40
                    ? `vs ${nextMatch.teams.away.name}`
                    : `@ ${nextMatch.teams.home.name}`}
                </span>
                <span className="font-barlow text-[10px] text-stadium-muted">
                  ·{" "}
                  {new Date(nextMatch.fixture.date).toLocaleDateString(
                    "en-GB",
                    { day: "numeric", month: "short" }
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabbed content ── */}
      <SeasonTabs
        fixturesPanel={fixturesPanel}
        standingsPanel={standingsPanel}
        statsPanel={statsPanel}
        defaultTab={tab}
        matchCount={fixtures.length}
        teamCount={standings.length}
      />
    </div>
  );
}
