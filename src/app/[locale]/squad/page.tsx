import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { LocaleParams } from "@/i18n/routing";
import { calculateAge, getAllPlayers, getCoach, getSquadPlayers } from "@/lib/squad-data";
import clubInfoEn from "@/data/club-info.json";
import clubInfoVi from "@/data/club-info.vi.json";
import { PageHero } from "@/components/ui/page-hero";
import { SquadGrid } from "@/components/squad/squad-grid";
import { DataPulseStrip, PresetConnectedGrid, SectionSubNav } from "@/components/ui/hub-links";
import { makePageMeta } from "@/lib/seo";
import { buildLocalizedBreadcrumbJsonLd } from "@/lib/seo-breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { getCurrentSeasonLabel } from "@/lib/football/current-season";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Squad.metadata" });
  const title = t("title");
  const description = t("description", { season: getCurrentSeasonLabel() });
  return { title, description, ...makePageMeta(title, description, { locale, path: "/squad" }) };
}

export const revalidate = 86400; // season label is derived from the date

export default async function SquadPage({ params }: LocaleParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tHub, tHistory] = await Promise.all([
    getTranslations("Squad"),
    getTranslations("Hub"),
    getTranslations("History"),
  ]);

  const seasonLabel = getCurrentSeasonLabel();
  const activeSquad = getSquadPlayers();
  const activeCount = activeSquad.length;
  const onLoanCount = getAllPlayers().filter((p) => p.onLoan).length;
  const coach = getCoach();
  const clubInfo = locale === "vi" ? clubInfoVi : clubInfoEn;
  const gkCount = activeSquad.filter((p) => p.position === "goalkeeper").length;
  const defCount = activeSquad.filter((p) => p.position === "defender").length;
  const midCount = activeSquad.filter((p) => p.position === "midfielder").length;
  const fwdCount = activeSquad.filter((p) => p.position === "forward").length;
  const managerEntry =
    clubInfo.managers.find((m) => m.name === coach.name) ??
    clubInfo.managers[clubInfo.managers.length - 1];
  const coachPhoto =
    "image" in managerEntry && managerEntry.image
      ? managerEntry.image
      : "/assets/lfc/history/andoni-iraola.webp";

  // Slim the data: cards need no bios or honours, and everything passed here is shipped to the browser.
  const squadPlayers = getSquadPlayers({ includeLoans: true, includeForever: true }).map((p) => ({
    id: p.id,
    name: p.name,
    shirtNumber: p.shirtNumber,
    shirtName: p.shirtName,
    slug: p.slug,
    position: p.position,
    age: calculateAge(p.dateOfBirth),
    onLoan: p.onLoan,
    forever: p.forever,
    photo: p.photo,
    localPhoto: p.localPhoto,
  }));

  const squadPulseItems = [
    {
      label: tHub("metrics.squadSize"),
      value: activeCount,
      sublabel: `${gkCount} GK · ${defCount} DEF · ${midCount} MID · ${fwdCount} FWD`,
      accent: "red" as const,
    },
    ...(onLoanCount > 0
      ? [
          {
            label: tHub("metrics.onLoan"),
            value: onLoanCount,
            sublabel: tHub("nav.transfers"),
            href: "/transfers",
            accent: "gold" as const,
          },
        ]
      : []),
    {
      label: tHub("metrics.majorHonours"),
      value: clubInfo.honours.leagueTitles + clubInfo.honours.championsLeague,
      sublabel: `${clubInfo.honours.leagueTitles} PL · ${clubInfo.honours.championsLeague} UCL`,
      href: "/history",
      accent: "gold" as const,
    },
  ];

  return (
    <div className="min-h-screen">
      <JsonLd data={await buildLocalizedBreadcrumbJsonLd(locale, [{ nav: "squad", path: "/squad" }])} />
      <PageHero
        clubCrest
        eyebrow={t("season", { season: seasonLabel })}
        title={t("title")}
        description={t("count", { count: squadPlayers.length, n: squadPlayers.length })}
        image="/assets/lfc/stadium/anfield-pitch.webp"
      />
      <div className="page-container space-y-6 pb-16 pt-4 sm:space-y-8 sm:pt-6">
        <SectionSubNav group="club" current="squad" />

        <DataPulseStrip eyebrow={tHub("seasonPulse")} items={squadPulseItems} />

        <section
          aria-label={tHub("metrics.headCoach")}
          className="border border-[var(--line)] border-l-2 border-l-lfc-red bg-[var(--surface-2)] p-4 sm:p-5"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-full border border-stadium-border bg-stadium-surface2 sm:size-20">
                <Image
                  src={coachPhoto}
                  alt={managerEntry.name}
                  fill
                  sizes="80px"
                  className="object-cover object-top"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Image
                    src="/assets/lfc/crest.webp"
                    alt=""
                    width={16}
                    height={20}
                    className="h-4 w-3.5 shrink-0 object-contain"
                  />
                  <p className="section-label text-brand">{tHub("metrics.headCoach")}</p>
                </div>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className="font-bebas text-2xl leading-none tracking-wide text-white sm:text-3xl">
                    {managerEntry.name}
                  </h2>
                  <span className="font-barlow text-xs font-bold uppercase tracking-[0.14em] text-lfc-gold">
                    {managerEntry.years}
                  </span>
                </div>
                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-stadium-muted">
                  {locale === "vi" ? tHistory("eras.today.summary") : coach.metaDescription}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link
                href="/history"
                className="inline-flex min-h-10 items-center gap-1.5 border border-stadium-border bg-stadium-surface2 px-3.5 py-2 font-barlow text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:border-white/25 hover:text-lfc-gold"
              >
                {tHub("nav.history")}
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
              <Link
                href="/fixtures"
                className="inline-flex min-h-10 items-center gap-1.5 border border-lfc-red/50 bg-lfc-red/15 px-3.5 py-2 font-barlow text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-lfc-red"
              >
                {tHub("nav.fixtures")}
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        <SquadGrid players={squadPlayers} />

        <PresetConnectedGrid
          preset="fromSquad"
          metaOverrides={{
            ...(onLoanCount > 0 && { transfers: `${onLoanCount} ${tHub("metrics.onLoan")}` }),
            stats: seasonLabel,
            history: `${clubInfo.honours.leagueTitles} · ${clubInfo.honours.championsLeague}`,
          }}
        />
      </div>
    </div>
  );
}
