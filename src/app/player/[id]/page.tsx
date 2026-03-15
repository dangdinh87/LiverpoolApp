import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Ruler, Shirt, Trophy, Weight } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { getAllPlayers, getPlayerBySlug, getPlayerBio, POSITION_DISPLAY, calculateAge } from "@/lib/squad-data";
import type { PlayerPosition } from "@/lib/squad-data";
import { getPlayerStats } from "@/lib/football";
import { getFplPlayerStats } from "@/lib/football/fpl-stats";
import { Badge } from "@/components/ui/badge";
import { PlayerFavouriteButton } from "@/components/player/player-favourite-button";
import { PlayerSeasonStats } from "@/components/player/player-season-stats";
import { cn } from "@/lib/utils";
import { makePageMeta } from "@/lib/seo";

// ─── Country flag emoji mapping ──────────────────────────────────────────────

const NATIONALITY_FLAGS: Record<string, string> = {
  Argentinian: "🇦🇷",
  Brazilian: "🇧🇷",
  Czech: "🇨🇿",
  Dutch: "🇳🇱",
  Egyptian: "🇪🇬",
  English: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  French: "🇫🇷",
  Georgian: "🇬🇪",
  German: "🇩🇪",
  Greek: "🇬🇷",
  Hungarian: "🇭🇺",
  Irish: "🇮🇪",
  Italian: "🇮🇹",
  Japanese: "🇯🇵",
  "Northern Irish": "🇬🇧",
  Portuguese: "🇵🇹",
  Scottish: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  Spanish: "🇪🇸",
  Swedish: "🇸🇪",
  Welsh: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  Colombian: "🇨🇴",
  Belgian: "🇧🇪",
  Uruguayan: "🇺🇾",
  Senegalese: "🇸🇳",
  Guinean: "🇬🇳",
  American: "🇺🇸",
};

function getFlag(nationality: string): string {
  return NATIONALITY_FLAGS[nationality] ?? "🏳️";
}

// ─── Types & constants ───────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

const HONOR_TROPHY_IMAGE: Record<string, string> = {
  "Premier League": "/assets/lfc/trophies/league-title.svg",
  "Champions League": "/assets/lfc/trophies/european-cup.svg",
  "FA Cup": "/assets/lfc/trophies/fa-cup.svg",
  "Carabao Cup": "/assets/lfc/trophies/league-cup.svg",
  "League Cup": "/assets/lfc/trophies/league-cup.svg",
  "FIFA Club World Cup": "/assets/lfc/trophies/fifa-club-world-cup.svg",
  "UEFA Super Cup": "/assets/lfc/trophies/uefa-super-cup.svg",
  "UEFA Cup": "/assets/lfc/trophies/uefa-cup.svg",
  "FA Community Shield": "/assets/lfc/trophies/community-shield.svg",
  "Community Shield": "/assets/lfc/trophies/community-shield.svg",
};

const POS_ACCENT: Record<PlayerPosition, { bg: string; text: string; border: string }> = {
  goalkeeper: { bg: "bg-yellow-500", text: "text-white", border: "border-yellow-500" },
  defender: { bg: "bg-blue-500", text: "text-white", border: "border-blue-500" },
  midfielder: { bg: "bg-green-600", text: "text-white", border: "border-green-600" },
  forward: { bg: "bg-lfc-red", text: "text-white", border: "border-lfc-red" },
};

// ─── Static generation ───────────────────────────────────────────────────────

export async function generateStaticParams() {
  const players = getAllPlayers();
  return players.map((p) => ({ id: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const player = getPlayerBySlug(id);
  if (!player) return { title: "Player" };
  const description = player.metaDescription || `${player.name} — ${POSITION_DISPLAY[player.position]} at Liverpool FC.`;
  const images = player.photoLg ? [{ url: player.photoLg, width: 400, height: 400 }] : [];
  return {
    title: player.name,
    description,
    openGraph: {
      title: player.name,
      description,
      type: "profile",
      ...(images.length > 0 && { images }),
      siteName: "Liverpool FC Fan Site",
    },
    twitter: {
      card: "summary_large_image",
      title: player.name,
      description,
      ...(player.photoLg && { images: [player.photoLg] }),
    },
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function PlayerPage({ params }: PageProps) {
  const { id } = await params;
  const player = getPlayerBySlug(id);
  if (!player) notFound();

  const t = await getTranslations("PlayerDetail");
  const locale = await getLocale();

  const age = calculateAge(player.dateOfBirth);
  const dob = new Date(player.dateOfBirth).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const accent = POS_ACCENT[player.position];
  const heroImage = player.localBodyShot || player.localPhoto;
  const flag = getFlag(player.nationality);

  // Fetch player stats: canonical (mapped from FPL) + raw FPL data
  const [playerStats, fplStats] = await Promise.all([
    getPlayerStats(player.id),
    getFplPlayerStats(player.name),
  ]);

  const bio = getPlayerBio(player.slug, locale);
  const bioParagraphs = bio
    ? bio.split(/\n{2,}|(?<=\.)(?=\s[A-Z])/).filter(Boolean).slice(0, 6)
    : [];

  return (
    <div className="min-h-screen">
      {/* ═══════════════════════════════════════════════════════════════════════
          HERO — body shot + key info overlay
         ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[70vh] md:min-h-[80vh] overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-stadium-bg via-stadium-surface to-stadium-bg" />

        {/* Giant shirt number watermark */}
        <span
          className="absolute -right-8 top-1/2 -translate-y-1/2 font-bebas text-white/[0.10] leading-none pointer-events-none select-none"
          style={{ fontSize: "clamp(20rem, 50vw, 40rem)" }}
          aria-hidden="true"
        >
          {player.shirtNumber}
        </span>

        {/* LFC crest watermark */}
        <div className="absolute left-8 md:left-16 top-1/2 -translate-y-1/2 w-48 md:w-72 opacity-[0.10] pointer-events-none select-none">
          <Image src="/assets/lfc/crest.webp" alt="" width={288} height={288} aria-hidden="true" />
        </div>

        {/* Red accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-lfc-red to-transparent" />

        {/* Content grid */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12 flex flex-col md:flex-row items-end md:items-center min-h-[70vh] md:min-h-[80vh] gap-8">
          {/* Left: player info */}
          <div className="flex-1 order-2 md:order-1 pb-8 md:pb-0">
            {/* Back nav */}
            <Link
              href="/squad"
              className="inline-flex items-center gap-2 text-stadium-muted hover:text-white font-inter text-sm transition-colors group mb-8"
            >
              <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
              {t("backSquad")}
            </Link>

            {/* Position badge + status */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Badge
                className={cn(
                  "text-sm font-barlow font-bold uppercase tracking-widest px-4 py-1.5",
                  accent.bg, accent.text, accent.border
                )}
              >
                {t(`positions.${player.position}`)}
              </Badge>
              {player.onLoan && (
                <Badge className="text-sm bg-amber-500 text-white border-amber-500 font-barlow font-bold uppercase tracking-widest px-3 py-1.5">
                  {t("status.onLoan")}
                </Badge>
              )}
              {player.forever && (
                <Badge className="text-sm bg-lfc-gold text-black border-lfc-gold font-barlow font-bold uppercase tracking-widest px-3 py-1.5">
                  {t("status.forever")}
                </Badge>
              )}
            </div>

            {/* Shirt number + name + favourite */}
            <div className="flex items-end gap-4 mb-2">
              <span className="font-bebas text-lfc-red text-6xl md:text-8xl leading-none">
                {player.shirtNumber}
              </span>
              <div className="pb-1 md:pb-2">
                <h1 className="font-bebas text-5xl md:text-7xl text-white tracking-wider leading-none">
                  {player.name}
                </h1>
              </div>
              <div className="pb-2 md:pb-3">
                <PlayerFavouriteButton
                  playerId={player.id}
                  playerName={player.name}
                  playerPhoto={player.photo}
                />
              </div>
            </div>

            {/* Meta description */}
            {player.metaDescription && (
              <p className="text-stadium-muted font-inter text-sm md:text-base leading-relaxed max-w-xl mt-4">
                {player.metaDescription}
              </p>
            )}

            {/* Quick info pills with flag */}
            <div className="flex flex-wrap gap-3 mt-6">
              <InfoPill icon={<span className="text-base">{flag}</span>} label={player.nationality} />
              <InfoPill icon={<Calendar size={14} />} label={`${dob} (${age})`} />
              <InfoPill icon={<Shirt size={14} />} label={`#${player.shirtNumber}`} />
              {player.height && <InfoPill icon={<Ruler size={14} />} label={player.height} />}
              {player.weight && <InfoPill icon={<Weight size={14} />} label={player.weight} />}
            </div>
          </div>

          {/* Right: body shot image */}
          <div className="relative order-1 md:order-2 w-full md:w-auto flex-shrink-0">
            <div className="relative h-[50vh] md:h-[70vh] w-full md:w-[400px] lg:w-[480px]">
              <div className={cn(
                "absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-1/2 rounded-full blur-3xl opacity-20",
                accent.bg
              )} />
              <Image
                src={heroImage}
                alt={player.name}
                fill
                sizes="(max-width: 768px) 100vw, 480px"
                className="object-contain object-bottom drop-shadow-2xl"
                priority
              />
            </div>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-stadium-bg to-transparent" />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          DETAIL SECTIONS
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 -mt-8 relative z-10 space-y-8">

        {/* ─── Player Information ─── */}
        <section className="bg-stadium-surface border border-stadium-border rounded-none overflow-hidden">
          <div className="p-6 md:p-8">
            <h2 className="font-bebas text-3xl text-white tracking-wider mb-6">
              {t("sections.playerInfo")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4">
              <InfoRow label={t("info.fullName")} value={player.name} />
              <InfoRow label={t("info.shirtName")} value={player.shirtName || "—"} />
              <InfoRow label={t("info.nationality")} value={`${flag} ${player.nationality}`} />
              <InfoRow label={t("info.dob")} value={dob} />
              <InfoRow label={t("info.age")} value={t("info.ageYears", { age })} />
              {player.height && <InfoRow label={t("info.height")} value={player.height} />}
              {player.weight && <InfoRow label={t("info.weight")} value={player.weight} />}
              <InfoRow label={t("info.position")} value={t(`positions.${player.position}`)} />
              <InfoRow label={t("info.shirtNumber")} value={`#${player.shirtNumber}`} />
              <InfoRow
                label={t("info.status")}
                value={player.forever ? t("status.forever") : player.onLoan ? t("status.onLoan") : t("status.active")}
                highlight={player.forever ? "gold" : undefined}
              />
            </div>
          </div>
        </section>

        {/* ─── Stats cards ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label={t("info.shirtNumber")} value={`#${player.shirtNumber}`} />
          <StatCard label={t("info.position")} value={t(`positions.${player.position}`)} accent />
          <StatCard label={t("info.age")} value={String(age)} />
          <StatCard label={t("info.honours")} value={String(player.honors.length)} gold />
        </div>

        {/* ─── Season Statistics ─── */}
        <PlayerSeasonStats
          statistics={playerStats?.statistics ?? []}
          fplStats={fplStats}
          position={player.position}
        />

        {/* ─── Honours showcase ─── */}
        {player.honors.length > 0 && (
          <section className="bg-stadium-surface border border-stadium-border rounded-none p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <Image
                src="/assets/lfc/trophies/european-cup.svg"
                alt="Trophy"
                width={40}
                height={40}
                className="object-contain"
              />
              <h2 className="font-bebas text-3xl text-white tracking-wider">
                {t("sections.honours")}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {player.honors.map((honor) => {
                const match = honor.match(/^(.+?)\s*\((.+)\)$/);
                const trophy = match ? match[1] : honor;
                const years = match ? match[2] : "";
                const yearCount = years ? years.split(",").length : 0;
                const trophyImage = HONOR_TROPHY_IMAGE[trophy];

                return (
                  <div
                    key={honor}
                    className="group relative overflow-hidden rounded-none bg-gradient-to-br from-stadium-surface2/80 to-stadium-surface border border-stadium-border/50 p-4 hover:border-lfc-gold/30 transition-all duration-300"
                  >
                    {yearCount > 1 && (
                      <span className="absolute top-3 right-3 font-bebas text-lfc-gold/80 text-2xl leading-none">
                        ×{yearCount}
                      </span>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 shrink-0 mt-0.5">
                        {trophyImage ? (
                          <Image
                            src={trophyImage}
                            alt={trophy}
                            width={36}
                            height={36}
                            className="object-contain w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full rounded-none bg-lfc-gold/10 flex items-center justify-center">
                            <Trophy size={16} className="text-lfc-gold" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-white text-sm font-inter font-semibold leading-tight">
                          {trophy}
                        </p>
                        {years && (
                          <p className="text-stadium-muted text-xs font-inter mt-1">{years}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── Biography ─── */}
        {bio && (
          <section className="bg-stadium-surface border border-stadium-border rounded-none p-6 md:p-8">
            <h2 className="font-bebas text-3xl text-white tracking-wider mb-6">
              {t("sections.biography")}
            </h2>
            <div className="prose prose-invert prose-sm max-w-none">
              {bioParagraphs.map((paragraph, i) => (
                <p
                  key={i}
                  className="text-stadium-muted font-inter text-sm leading-relaxed mb-4 last:mb-0"
                >
                  {paragraph.trim()}
                </p>
              ))}
            </div>
          </section>
        )}

        {/* ─── View on LFC link ─── */}
        <div className="text-center">
          <a
            href={`https://www.liverpoolfc.com/team/mens/player/${player.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-stadium-muted hover:text-lfc-red font-inter text-sm transition-colors"
          >
            {t("viewOnLfc")}
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stadium-surface border border-stadium-border text-sm font-inter text-stadium-muted">
      {icon}
      {label}
    </span>
  );
}

function StatCard({ label, value, accent, gold }: { label: string; value: string; accent?: boolean; gold?: boolean }) {
  return (
    <div className="bg-stadium-surface border border-stadium-border rounded-none p-5 text-center">
      <div
        className={cn(
          "font-bebas text-4xl md:text-5xl leading-none mb-1",
          gold ? "text-lfc-gold" : accent ? "text-lfc-red" : "text-white"
        )}
      >
        {value}
      </div>
      <div className="font-barlow text-stadium-muted text-[10px] uppercase tracking-widest">
        {label}
      </div>
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: "gold" | "red" }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-stadium-border/30 last:border-0">
      <dt className="text-stadium-muted font-inter text-sm">{label}</dt>
      <dd
        className={cn(
          "font-inter text-sm font-medium",
          highlight === "gold" ? "text-lfc-gold" : highlight === "red" ? "text-lfc-red" : "text-white"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
