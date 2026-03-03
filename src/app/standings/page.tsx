import type { Metadata } from "next";
import { getStandings } from "@/lib/api-football";
import { StandingsTable } from "@/components/standings/standings-table";

export const metadata: Metadata = {
  title: "Standings",
  description: "Premier League standings 2024/25 season.",
};

// ISR: revalidate standings every 6h
export const revalidate = 21600;

export default async function StandingsPage() {
  const standings = await getStandings();

  // Find Liverpool's position for the header
  const lfcStanding = standings.find((s) => s.team.id === 40);

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-10">
          <p className="font-barlow text-lfc-red uppercase tracking-widest text-sm font-semibold mb-2">
            Premier League · 2024/25
          </p>
          <h1 className="font-bebas text-6xl md:text-7xl text-white tracking-wider leading-none mb-3">
            Standings
          </h1>
          {lfcStanding && (
            <p className="text-stadium-muted font-inter">
              Liverpool FC ·{" "}
              <span className="text-white font-medium">
                {(() => {
                  const r = lfcStanding.rank;
                  const suffix = r === 1 ? "st" : r === 2 ? "nd" : r === 3 ? "rd" : "th";
                  return `${r}${suffix} place`;
                })()}
              </span>{" "}
              · {lfcStanding.points} points
            </p>
          )}
        </div>

        <StandingsTable standings={standings} />
      </div>
    </div>
  );
}
