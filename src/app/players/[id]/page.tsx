import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getFplPlayerDetail } from "@/lib/fpl-data";
import { PlayerStatsCard } from "@/components/players/player-stats-card";
import { PlayerMatchLog, PlayerPastSeasons } from "@/components/players/player-match-log";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const player = await getFplPlayerDetail(Number(id));
  if (!player) return { title: "Player Not Found" };
  return {
    title: `${player.firstName} ${player.lastName}`,
    description: `${player.firstName} ${player.lastName} — ${player.position}, ${player.teamName}. ${player.goals} goals, ${player.assists} assists in the 2025/26 Premier League.`,
  };
}

export const revalidate = 3600; // 1 hour (element-summary)

export default async function PlayerDetailPage({ params }: Props) {
  const { id } = await params;
  const player = await getFplPlayerDetail(Number(id));

  if (!player) notFound();

  const statusLabel =
    player.status === "a" ? "Available" :
    player.status === "i" ? "Injured" :
    player.status === "s" ? "Suspended" :
    player.status === "d" ? "Doubtful" :
    "Unavailable";

  const statusColor =
    player.status === "a" ? "text-green-400" :
    player.status === "i" ? "text-orange-400" :
    player.status === "s" ? "text-red-400" :
    "text-yellow-400";

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative bg-gradient-to-b from-stadium-surface to-stadium-bg pt-20 pb-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back link */}
          <Link
            href="/players"
            className="inline-flex items-center gap-1.5 text-stadium-muted hover:text-white text-xs font-inter mb-6 transition-colors"
          >
            <ArrowLeft size={14} />
            All Players
          </Link>

          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Photo */}
            <div className="relative shrink-0">
              <Image
                src={player.photo}
                alt={player.webName}
                width={140}
                height={140}
                className="rounded-sm bg-stadium-surface2"
                unoptimized
                priority
              />
              {player.isLiverpool && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-lfc-red rounded-full flex items-center justify-center">
                  <Image
                    src={player.teamBadge}
                    alt="LFC"
                    width={16}
                    height={16}
                    unoptimized
                  />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Image
                  src={player.teamBadge}
                  alt={player.teamName}
                  width={20}
                  height={20}
                  unoptimized
                />
                <span className="font-inter text-stadium-muted text-xs">{player.teamName}</span>
                {player.squadNumber && (
                  <span className="font-bebas text-stadium-muted text-sm">#{player.squadNumber}</span>
                )}
              </div>
              <h1 className="font-bebas text-5xl md:text-6xl text-white tracking-wider leading-none mb-2">
                {player.firstName} {player.lastName}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs font-inter">
                <span className={cn(
                  "font-barlow font-semibold uppercase tracking-wider px-2 py-0.5",
                  player.position === "GK" ? "text-amber-400 bg-amber-400/10" :
                  player.position === "DEF" ? "text-green-400 bg-green-400/10" :
                  player.position === "MID" ? "text-blue-400 bg-blue-400/10" :
                  "text-red-400 bg-red-400/10",
                )}>
                  {player.position}
                </span>
                <span className={statusColor}>
                  {statusLabel}
                </span>
                {player.news && (
                  <span className="text-stadium-muted">{player.news}</span>
                )}
              </div>

              {/* Quick stats row */}
              <div className="flex flex-wrap gap-4 mt-4">
                {[
                  { label: "Points", value: player.totalPoints },
                  { label: "Goals", value: player.goals },
                  { label: "Assists", value: player.assists },
                  { label: "Form", value: player.form },
                  { label: "Price", value: `£${player.price.toFixed(1)}m` },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="font-bebas text-2xl text-white leading-none">{s.value}</p>
                    <p className="font-barlow text-[10px] text-stadium-muted uppercase tracking-wider">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 space-y-10">
        {/* Season Stats */}
        <section>
          <h2 className="font-bebas text-2xl text-white tracking-wider mb-4">
            2025/26 Season Stats
          </h2>
          <PlayerStatsCard player={player} />
        </section>

        {/* Match History */}
        <section>
          <h2 className="font-bebas text-2xl text-white tracking-wider mb-4">
            Match History
          </h2>
          <PlayerMatchLog matches={player.matchHistory} />
        </section>

        {/* Past Seasons */}
        {player.pastSeasons.length > 0 && (
          <section>
            <h2 className="font-bebas text-2xl text-white tracking-wider mb-4">
              Past Seasons
            </h2>
            <PlayerPastSeasons seasons={player.pastSeasons} />
          </section>
        )}
      </div>
    </div>
  );
}
