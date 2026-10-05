import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trophy } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { getAllPlayers, getPlayerBySlug, getPlayerBio, POSITION_DISPLAY, calculateAge } from "@/lib/squad-data";
import type { PlayerPosition } from "@/lib/squad-data";
import { getPlayerStats } from "@/lib/football";
import { getFplPlayerStats } from "@/lib/football/fpl-stats";
import { PlayerFavouriteButton } from "@/components/player/player-favourite-button";
import { PlayerPhoto } from "@/components/player/player-photo";
import { SectionHeader } from "@/components/ui/section-header";
import { PlayerSeasonStats } from "@/components/player/player-season-stats";
import { cn } from "@/lib/utils";
import { getHreflangAlternates, buildBreadcrumbJsonLd, buildPersonJsonLd, getCanonical } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";

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

const POS_ACCENT: Record<PlayerPosition, { bg: string; text: string }> = {
  goalkeeper: { bg: "bg-yellow-400", text: "text-black" },
  defender: { bg: "bg-blue-600", text: "text-white" },
  midfielder: { bg: "bg-green-700", text: "text-white" },
  forward: { bg: "bg-lfc-red", text: "text-white" },
};

// ─── Static generation ───────────────────────────────────────────────────────

/** First ~155 characters of a bio, cut at a word boundary, for meta descriptions. */
function summarize(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, clean.lastIndexOf(" ", max - 1))}…`;
}

/**
 * Split a bio into paragraphs. Bios with blank-line breaks keep them; a bio
 * written as one block is grouped three sentences at a time. (Splitting on
 * every sentence turned the Vietnamese bios into one-line paragraphs.)
 */
function toParagraphs(text: string): string[] {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length !== 1) return blocks;
  const sentences = blocks[0].match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) ?? [blocks[0]];
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += 3) {
    paragraphs.push(sentences.slice(i, i + 3).join("").trim());
  }
  return paragraphs;
}

export async function generateStaticParams() {
  const players = getAllPlayers();
  return players.map((p) => ({ id: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const player = getPlayerBySlug(id);
  if (!player) return { title: "Player" };
  const locale = await getLocale();
  // metaDescription is English-only; Vietnamese visitors (and Googlebot, which
  // gets the default "vi") get the opening of the Vietnamese bio instead.
  const viSummary = locale === "vi" ? summarize(getPlayerBio(player.slug, "vi")) : "";
  const description =
    viSummary ||
    player.metaDescription ||
    `${player.name} — ${POSITION_DISPLAY[player.position]} at Liverpool FC.`;
  const images = player.photoLg ? [{ url: player.photoLg, width: 400, height: 400 }] : [];
  return {
    title: player.name,
    description,
    alternates: getHreflangAlternates(`/player/${id}`),
    openGraph: {
      title: player.name,
      description,
      type: "profile",
      ...(images.length > 0 && { images }),
      siteName: "Liverpool FC Việt Nam",
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

  const [t, locale] = await Promise.all([getTranslations("PlayerDetail"), getLocale()]);

  const age = calculateAge(player.dateOfBirth);
  // dateOfBirth is a date-only string (UTC midnight): format in UTC so it never
  // shifts a day, and in the visitor's language.
  const dob = new Date(player.dateOfBirth).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const accent = POS_ACCENT[player.position];
  const flag = getFlag(player.nationality);

  const [playerStats, fplStats] = await Promise.all([
    getPlayerStats(player.id),
    getFplPlayerStats(player.name),
  ]);

  const bio = getPlayerBio(player.slug, locale);
  const bioParagraphs = toParagraphs(bio).slice(0, 6);

  const facts: { label: string; value: string; highlight?: boolean }[] = [
    { label: t("info.nationality"), value: `${flag} ${player.nationality}` },
    { label: t("info.age"), value: t("info.ageYears", { age }) },
    { label: t("info.dob"), value: dob },
    { label: t("info.position"), value: t(`positions.${player.position}`) },
    ...(player.height ? [{ label: t("info.height"), value: player.height }] : []),
    ...(player.weight ? [{ label: t("info.weight"), value: player.weight }] : []),
    { label: t("info.shirtName"), value: player.shirtName || "—" },
    {
      label: t("info.status"),
      value: player.forever ? t("status.forever") : player.onLoan ? t("status.onLoan") : t("status.active"),
      highlight: player.forever,
    },
  ];

  return (
    <div className="min-h-screen">
      <JsonLd data={[
        buildBreadcrumbJsonLd([
          { name: "Home", url: getCanonical("/") },
          { name: "Squad", url: getCanonical("/squad") },
          { name: player.name, url: getCanonical(`/player/${player.slug}`) },
        ]),
        buildPersonJsonLd({
          name: player.name,
          birthDate: player.dateOfBirth,
          nationality: player.nationality,
          image: player.photoLg,
          url: getCanonical(`/player/${player.slug}`),
          position: player.position,
        }),
      ]} />

      {/* ─── Hero: compact row on phones (photo left), split layout from md ─── */}
      <header className="relative isolate overflow-hidden border-b border-[var(--line)]">
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-br from-[var(--surface-2)] via-stadium-bg to-stadium-bg" />
        <span
          aria-hidden
          className="pointer-events-none absolute -right-2 bottom-0 -z-10 select-none font-bebas leading-[0.8] text-white/[0.05]"
          style={{ fontSize: "clamp(12rem, 38vw, 28rem)" }}
        >
          {player.shirtNumber}
        </span>
        <div className="page-container pb-6 pt-[calc(var(--header-h)+1rem)] sm:pb-10 sm:pt-[calc(var(--header-h)+1.5rem)]">
          <Link
            href="/squad"
            className="group mb-4 inline-flex min-h-10 items-center gap-2 text-sm text-stadium-muted transition-colors hover:text-white"
          >
            <ArrowLeft size={16} aria-hidden className="transition-transform group-hover:-translate-x-1" />
            {t("backSquad")}
          </Link>

          <div className="flex items-end gap-4 sm:gap-8 md:items-center">
            {/* Photo box: fixed aspect, object-contain so square or missing body shots never crop badly */}
            <div className="relative aspect-[4/5] w-32 shrink-0 sm:w-56 md:w-72 lg:w-80 md:order-2 md:ml-auto">
              <span aria-hidden className={cn("absolute inset-x-[12%] bottom-0 h-1/2 rounded-full opacity-25 blur-3xl", accent.bg)} />
              <PlayerPhoto
                src={player.localBodyShot}
                fallback={player.localPhoto}
                alt={player.name}
                sizes="(min-width:1024px) 320px, (min-width:768px) 288px, (min-width:640px) 224px, 128px"
                priority
              />
            </div>

            <div className="min-w-0 flex-1 pb-1 md:order-1 md:pb-0">
              <div className="mb-3 flex flex-wrap items-center gap-2 font-barlow text-xs font-bold uppercase tracking-[0.12em]">
                <span className={cn("px-2.5 py-1", accent.bg, accent.text)}>{t(`positions.${player.position}`)}</span>
                {player.onLoan && <span className="bg-amber-500 px-2.5 py-1 text-black">{t("status.onLoan")}</span>}
                {player.forever && <span className="bg-lfc-gold px-2.5 py-1 text-black">{t("status.forever")}</span>}
              </div>
              <p className="font-bebas text-5xl leading-none text-brand sm:text-7xl">{player.shirtNumber}</p>
              <h1 className="mt-1 font-bebas text-4xl leading-[0.95] text-white text-balance sm:text-6xl lg:text-7xl">{player.name}</h1>
              <p className="mt-3 text-[15px] text-stadium-muted">
                <span aria-hidden>{flag} </span>
                {player.nationality} · {t("info.ageYears", { age })}
              </p>
              <div className="mt-4">
                <PlayerFavouriteButton playerId={player.id} playerName={player.name} playerPhoto={player.photo} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="page-container space-y-10 pb-20 pt-8 sm:space-y-14 sm:pt-12">
        {/* ─── Key facts ─── */}
        <section>
          <SectionHeader title={t("sections.playerInfo")} />
          <dl className="surface grid grid-cols-2 gap-px bg-[var(--line)] sm:grid-cols-4">
            {facts.map((f) => (
              <div key={f.label} className="bg-[var(--surface-2)] px-4 py-3.5">
                <dt className="font-barlow text-xs font-semibold uppercase tracking-[0.12em] text-stadium-muted">{f.label}</dt>
                <dd className={cn("mt-1 text-[15px] font-medium", f.highlight ? "text-lfc-gold" : "text-white")}>{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ─── Season statistics (has its own empty state) ─── */}
        <PlayerSeasonStats
          statistics={playerStats?.statistics ?? []}
          fplStats={fplStats}
          position={player.position}
        />

        {/* ─── Biography ─── */}
        {bio && (
          <section>
            <SectionHeader title={t("sections.biography")} />
            <div className="max-w-[65ch] space-y-4">
              {bioParagraphs.map((paragraph, i) => (
                <p key={i} className="text-[15px] leading-7 text-white/80 sm:text-base sm:leading-8">
                  {paragraph.trim()}
                </p>
              ))}
            </div>
          </section>
        )}

        {/* ─── Honours ─── */}
        {player.honors.length > 0 && (
          <section>
            <SectionHeader title={t("sections.honours")} eyebrow={t("info.honours")} />
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {player.honors.map((honor) => {
                const match = honor.match(/^(.+?)\s*\((.+)\)$/);
                const trophy = match ? match[1] : honor;
                const years = match ? match[2] : "";
                const yearCount = years ? years.split(",").length : 0;
                const trophyImage = HONOR_TROPHY_IMAGE[trophy];

                return (
                  <li key={honor} className="surface relative flex min-h-16 items-center gap-3 p-4">
                    {yearCount > 1 && (
                      <span className="absolute right-3 top-2 font-bebas text-2xl leading-none text-lfc-gold">×{yearCount}</span>
                    )}
                    <span className="relative size-9 shrink-0">
                      {trophyImage ? (
                        <Image src={trophyImage} alt="" fill sizes="36px" className="object-contain" />
                      ) : (
                        <span className="flex size-full items-center justify-center bg-lfc-gold/10">
                          <Trophy size={16} aria-hidden className="text-lfc-gold" />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 pr-8">
                      <span className="block text-sm font-semibold leading-tight text-white">{trophy}</span>
                      {years && <span className="mt-1 block text-xs text-stadium-muted">{years}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <p className="text-center">
          <a
            href={`https://www.liverpoolfc.com/team/mens/player/${player.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 text-sm text-stadium-muted transition-colors hover:text-white"
          >
            {t("viewOnLfc")}
            <svg aria-hidden className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </p>
      </div>
    </div>
  );
}
