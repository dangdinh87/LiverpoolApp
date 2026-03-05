import type { Metadata } from "next";
import { getSquadPlayers } from "@/lib/squad-data";
import { getInjuries } from "@/lib/football";
import { SquadGrid } from "@/components/squad/squad-grid";
import { InjuryWidget } from "@/components/squad/injury-widget";

export const metadata: Metadata = {
  title: "Squad",
  description: "Liverpool FC first-team squad for the 2025/26 season.",
};

export const revalidate = 1800; // 30min (injuries update)

export default async function SquadPage() {
  const players = getSquadPlayers({ includeLoans: true, includeForever: true });
  const injuries = await getInjuries();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative h-[40vh] min-h-[320px] flex items-end">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/lfc/stadium/anfield-pitch.webp')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stadium-bg via-stadium-bg/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-stadium-bg/80 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 w-full">
          <p className="font-barlow text-lfc-red uppercase tracking-widest text-sm font-semibold mb-2">
            2025/26 Season
          </p>
          <h1 className="font-bebas text-7xl md:text-8xl text-white tracking-wider leading-none mb-3">
            The Squad
          </h1>
          <div className="flex items-center gap-4">
            <p className="font-inter text-stadium-muted">
              {players.length} players · Liverpool FC
            </p>
            {injuries.length > 0 && <InjuryWidget injuries={injuries} />}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">
        {/* Squad grid with search and position filter */}
        <SquadGrid players={players} />
      </div>
    </div>
  );
}
