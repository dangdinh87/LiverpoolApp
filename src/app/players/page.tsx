import type { Metadata } from "next";
import { getAllFplPlayers } from "@/lib/fpl-data";
import { PlayersTable } from "@/components/players/players-table";

export const metadata: Metadata = {
  title: "Players",
  description: "Premier League player statistics — goals, assists, xG, xA, form and more from the 2025/26 season.",
};

export const revalidate = 1800; // 30 min

export default async function PlayersPage() {
  const { players, teams } = await getAllFplPlayers();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative h-[30vh] min-h-[240px] flex items-end">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/lfc/stadium/anfield-pitch.webp')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stadium-bg via-stadium-bg/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-stadium-bg/80 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 w-full">
          <p className="font-barlow text-lfc-red uppercase tracking-widest text-sm font-semibold mb-2">
            2025/26 Premier League
          </p>
          <h1 className="font-bebas text-6xl md:text-7xl text-white tracking-wider leading-none mb-2">
            Player Stats
          </h1>
          <p className="font-inter text-stadium-muted text-sm">
            {players.length} players across {teams.length} clubs · Powered by FPL
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
        <PlayersTable players={players} teams={teams} />
      </div>
    </div>
  );
}
