import type { Metadata } from "next";
import { getStandings } from "@/lib/football";
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
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative h-[40vh] min-h-[320px] flex items-end">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/lfc/stadium/anfield-corner-flag.webp')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stadium-bg via-stadium-bg/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-stadium-bg/80 to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 w-full">
          <p className="font-barlow text-lfc-red uppercase tracking-widest text-sm font-semibold mb-2">
            Premier League · 2024/25
          </p>
          <h1 className="font-bebas text-7xl md:text-8xl text-white tracking-wider leading-none mb-3">
            Standings
          </h1>
          {lfcStanding && (
            <p className="font-inter text-stadium-muted">
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
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">
        <StandingsTable standings={standings} />
      </div>
    </div>
  );
}
