import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getFplPlayerDetail } from "@/lib/fpl-data";
import { PlayerStatsCard } from "@/components/players/player-stats-card";
import { PlayerMatchLog, PlayerPastSeasons } from "@/components/players/player-match-log";
import { PlayerImage } from "@/components/players/player-image";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const player = await getFplPlayerDetail(Number(id));
  if (!player) return { title: "Player Not Found" };
  return {
    title: `${player.firstName} ${player.lastName} — Liverpool FC`,
    description: `${player.firstName} ${player.lastName} — ${player.position}. ${player.goals} goals, ${player.assists} assists in the 2025/26 Premier League.`,
  };
}

export const revalidate = 3600;

const STATUS_KEYS: Record<string, string> = {
  a: "available",
  i: "injured",
  s: "suspended",
  d: "doubtful",
  u: "unavailable",
};

const STATUS_COLORS: Record<string, { color: string; dot: string }> = {
  a: { color: "text-green-400", dot: "bg-green-500" },
  i: { color: "text-orange-400", dot: "bg-orange-500" },
  s: { color: "text-red-400", dot: "bg-red-500" },
  d: { color: "text-yellow-400", dot: "bg-yellow-500" },
  u: { color: "text-gray-400", dot: "bg-gray-500" },
};

export default async function PlayerDetailPage({ params }: Props) {
  const { id } = await params;
  const [player, t] = await Promise.all([
    getFplPlayerDetail(Number(id)),
    getTranslations("PlayerDetail"),
  ]);

  if (!player || !player.isLiverpool) notFound();

  const statusKey = STATUS_KEYS[player.status] ?? "unavailable";
  const statusColors = STATUS_COLORS[player.status] ?? STATUS_COLORS.u;

  return (
    <div className="min-h-screen">
      {/* ─── Hero ────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Background: dark gradient with subtle red accent */}
        <div className="absolute inset-0 bg-gradient-to-br from-stadium-bg via-stadium-surface to-stadium-bg" />
        <div className="absolute inset-0 bg-gradient-to-r from-lfc-red/[0.06] to-transparent" />

        {/* LFC crest watermark */}
        <div className="absolute -right-10 top-1/2 -translate-y-1/2 w-80 h-80 opacity-[0.03] rotate-[-12deg] pointer-events-none select-none">
          <Image src="/assets/lfc/crest.webp" alt="" fill sizes="320px" className="object-contain" />
        </div>

        {/* Red accent line at top */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-lfc-red to-transparent" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-10">
          {/* Back link */}
          <Link
            href="/players"
            className="inline-flex items-center gap-1.5 text-stadium-muted hover:text-lfc-red text-xs font-inter mb-8 transition-colors"
          >
            <ArrowLeft size={14} />
            {t("back")}
          </Link>

          <div className="flex flex-col sm:flex-row items-start gap-8">
            {/* Player photo */}
            <div className="relative shrink-0">
              <div className="relative w-[160px] h-[160px] bg-gradient-to-b from-stadium-surface2 to-stadium-surface rounded-sm overflow-hidden ring-1 ring-stadium-border">
                <PlayerImage
                  src={player.photo}
                  alt={player.webName}
                  width={160}
                  height={160}
                  className="object-cover"
                  priority
                />
              </div>
              {/* LFC badge overlay */}
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-lfc-red rounded-full flex items-center justify-center ring-2 ring-stadium-bg shadow-lg">
                <Image src="/assets/lfc/crest.webp" alt="LFC" width={20} height={20} />
              </div>
            </div>

            {/* Player info */}
            <div className="flex-1 min-w-0">
              {/* Club + number */}
              <div className="flex items-center gap-2 mb-2">
                <Image src="/assets/lfc/crest.webp" alt="Liverpool FC" width={18} height={18} />
                <span className="font-barlow text-stadium-muted text-xs uppercase tracking-wider">Liverpool FC</span>
                {player.squadNumber && (
                  <>
                    <span className="text-stadium-border text-xs">·</span>
                    <span className="font-bebas text-lfc-red text-xl leading-none">#{player.squadNumber}</span>
                  </>
                )}
              </div>

              {/* Name */}
              <h1 className="font-bebas text-5xl md:text-6xl text-white tracking-wider leading-none mb-3">
                {player.firstName}{" "}
                <span className="text-lfc-red">{player.lastName}</span>
              </h1>

              {/* Position + Status badges */}
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <span className={cn(
                  "font-barlow font-semibold uppercase tracking-wider text-xs px-2.5 py-1",
                  player.position === "GK" ? "text-amber-400 bg-amber-400/10 border border-amber-400/20" :
                  player.position === "DEF" ? "text-blue-400 bg-blue-400/10 border border-blue-400/20" :
                  player.position === "MID" ? "text-green-400 bg-green-400/10 border border-green-400/20" :
                  "text-lfc-red bg-lfc-red/10 border border-lfc-red/20",
                )}>
                  {player.position}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className={cn("w-1.5 h-1.5 rounded-full", statusColors.dot)} />
                  <span className={cn("text-xs font-inter", statusColors.color)}>
                    {t(`status.${statusKey}`)}
                  </span>
                </span>
                {player.news && (
                  <span className="text-stadium-muted text-xs font-inter italic">{player.news}</span>
                )}
              </div>

              {/* Quick stats */}
              <div className="flex flex-wrap gap-5">
                {[
                  { label: t("quickStats.points"), value: player.totalPoints, highlight: true },
                  { label: t("quickStats.goals"), value: player.goals, highlight: player.goals > 0 },
                  { label: t("quickStats.assists"), value: player.assists, highlight: player.assists > 0 },
                  { label: t("quickStats.form"), value: player.form, highlight: parseFloat(player.form) >= 5 },
                  { label: t("quickStats.ppg"), value: (player.totalPoints / Math.max(player.starts, 1)).toFixed(1), highlight: false },
                  { label: t("quickStats.price"), value: `£${player.price.toFixed(1)}m`, highlight: false },
                ].map((s) => (
                  <div key={s.label} className="text-center min-w-[48px]">
                    <p className={cn(
                      "font-bebas text-3xl leading-none tracking-wider",
                      s.highlight ? "text-white" : "text-white/70",
                    )}>
                      {s.value}
                    </p>
                    <p className="font-barlow text-[10px] text-stadium-muted uppercase tracking-wider mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Content ─────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 space-y-10">
        {/* Season Stats */}
        <section>
          <h2 className="font-bebas text-2xl text-white tracking-wider mb-4 flex items-center gap-3">
            <span>{t("sections.seasonStats")}</span>
            <span className="w-8 h-0.5 bg-lfc-red" />
          </h2>
          <PlayerStatsCard player={player} />
        </section>

        {/* Match History */}
        <section>
          <h2 className="font-bebas text-2xl text-white tracking-wider mb-4 flex items-center gap-3">
            <span>{t("sections.matchHistory")}</span>
            <span className="w-8 h-0.5 bg-lfc-red" />
          </h2>
          <PlayerMatchLog matches={player.matchHistory} />
        </section>

        {/* Past Seasons */}
        {player.pastSeasons.length > 0 && (
          <section>
            <h2 className="font-bebas text-2xl text-white tracking-wider mb-4 flex items-center gap-3">
              <span>{t("sections.pastSeasons")}</span>
              <span className="w-8 h-0.5 bg-lfc-red" />
            </h2>
            <PlayerPastSeasons seasons={player.pastSeasons} />
          </section>
        )}
      </div>
    </div>
  );
}
