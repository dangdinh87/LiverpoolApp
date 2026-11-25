import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/* ── Shared Types & Route Maps ───────────────────────────────────── */

export type SubNavGroup = "match" | "club" | "editorial";

export type SubNavSlug =
  | "fixtures"
  | "standings"
  | "stats"
  | "season"
  | "predictions"
  | "squad"
  | "injuries"
  | "transfers"
  | "history"
  | "gallery"
  | "news"
  | "digest"
  | "analysis";

export type HubCardSlug =
  | SubNavSlug
  | "about"
  | "legal"
  | "profile";

export type ConnectedGridPreset =
  | "fromFixtures"
  | "fromStandings"
  | "fromStats"
  | "fromSeason"
  | "fromPredictions"
  | "fromFixtureDetail"
  | "fromSquad"
  | "fromPlayer"
  | "fromInjuries"
  | "fromTransfers"
  | "fromHistory"
  | "fromGallery"
  | "fromHome"
  | "fromNews"
  | "fromDigest"
  | "fromAnalysis"
  | "fromAbout"
  | "fromProfile";

const ROUTE_HREFS: Record<HubCardSlug, string> = {
  fixtures: "/fixtures",
  standings: "/standings",
  stats: "/stats",
  season: "/season",
  predictions: "/predictions",
  squad: "/squad",
  injuries: "/injuries",
  transfers: "/transfers",
  history: "/history",
  gallery: "/gallery",
  news: "/news",
  digest: "/news/digest",
  analysis: "/analysis",
  about: "/about",
  legal: "/legal",
  profile: "/profile",
};

const SUB_NAV_GROUPS: Record<SubNavGroup, readonly SubNavSlug[]> = {
  match: ["fixtures", "standings", "stats", "season", "predictions"],
  club: ["squad", "injuries", "transfers", "stats", "history", "gallery"],
  editorial: ["news", "digest", "analysis", "transfers", "injuries"],
};

const PRESET_CARDS: Record<
  ConnectedGridPreset,
  readonly { slug: HubCardSlug; accent?: "red" | "gold" }[]
> = {
  fromFixtures: [
    { slug: "standings", accent: "gold" },
    { slug: "predictions", accent: "red" },
    { slug: "injuries", accent: "red" },
    { slug: "analysis", accent: "gold" },
  ],
  fromStandings: [
    { slug: "fixtures", accent: "red" },
    { slug: "stats", accent: "gold" },
    { slug: "season", accent: "red" },
    { slug: "predictions", accent: "gold" },
  ],
  fromStats: [
    { slug: "squad", accent: "red" },
    { slug: "standings", accent: "gold" },
    { slug: "season", accent: "red" },
    { slug: "fixtures", accent: "gold" },
  ],
  fromSeason: [
    { slug: "stats", accent: "gold" },
    { slug: "fixtures", accent: "red" },
    { slug: "standings", accent: "gold" },
    { slug: "history", accent: "red" },
  ],
  fromPredictions: [
    { slug: "fixtures", accent: "red" },
    { slug: "standings", accent: "gold" },
    { slug: "injuries", accent: "red" },
    { slug: "analysis", accent: "gold" },
  ],
  fromFixtureDetail: [
    { slug: "standings", accent: "gold" },
    { slug: "injuries", accent: "red" },
    { slug: "predictions", accent: "red" },
    { slug: "analysis", accent: "gold" },
  ],
  fromSquad: [
    { slug: "injuries", accent: "red" },
    { slug: "transfers", accent: "gold" },
    { slug: "stats", accent: "red" },
    { slug: "history", accent: "gold" },
  ],
  fromPlayer: [
    { slug: "squad", accent: "red" },
    { slug: "stats", accent: "gold" },
    { slug: "injuries", accent: "red" },
    { slug: "transfers", accent: "gold" },
  ],
  fromInjuries: [
    { slug: "squad", accent: "red" },
    { slug: "fixtures", accent: "gold" },
    { slug: "transfers", accent: "red" },
    { slug: "news", accent: "gold" },
  ],
  fromTransfers: [
    { slug: "squad", accent: "red" },
    { slug: "digest", accent: "gold" },
    { slug: "injuries", accent: "red" },
    { slug: "news", accent: "gold" },
  ],
  fromHistory: [
    { slug: "gallery", accent: "gold" },
    { slug: "squad", accent: "red" },
    { slug: "fixtures", accent: "red" },
    { slug: "about", accent: "gold" },
  ],
  fromGallery: [
    { slug: "history", accent: "gold" },
    { slug: "squad", accent: "red" },
    { slug: "fixtures", accent: "red" },
    { slug: "news", accent: "gold" },
  ],
  fromHome: [
    { slug: "squad", accent: "red" },
    { slug: "injuries", accent: "red" },
    { slug: "transfers", accent: "gold" },
    { slug: "analysis", accent: "gold" },
  ],
  fromNews: [
    { slug: "digest", accent: "gold" },
    { slug: "analysis", accent: "red" },
    { slug: "transfers", accent: "gold" },
    { slug: "injuries", accent: "red" },
  ],
  fromDigest: [
    { slug: "news", accent: "red" },
    { slug: "analysis", accent: "gold" },
    { slug: "fixtures", accent: "red" },
    { slug: "transfers", accent: "gold" },
  ],
  fromAnalysis: [
    { slug: "fixtures", accent: "red" },
    { slug: "digest", accent: "gold" },
    { slug: "standings", accent: "gold" },
    { slug: "stats", accent: "red" },
  ],
  fromAbout: [
    { slug: "legal", accent: "gold" },
    { slug: "news", accent: "red" },
    { slug: "squad", accent: "red" },
    { slug: "history", accent: "gold" },
  ],
  fromProfile: [
    { slug: "predictions", accent: "gold" },
    { slug: "squad", accent: "red" },
    { slug: "news", accent: "red" },
    { slug: "fixtures", accent: "gold" },
  ],
};

/* ── 1. SectionSubNav ────────────────────────────────────────────── */

export interface SectionSubNavProps {
  group: SubNavGroup;
  current: SubNavSlug;
  badges?: Partial<Record<string, string | number>>;
  className?: string;
}

/** Horizontal scrollable section sub-navigation bar for Match, Club, and Editorial pages. */
export async function SectionSubNav({
  group,
  current,
  badges,
  className,
}: SectionSubNavProps) {
  const t = await getTranslations("Hub");
  const slugs = SUB_NAV_GROUPS[group];

  return (
    <nav
      aria-label={t("subNavLabel")}
      className={cn("w-full max-w-full border-b border-[var(--line)]", className)}
    >
      <div className="scroll-x scroll-x-fade flex items-center gap-1">
        {slugs.map((slug) => {
          const isActive = slug === current;
          const badge = badges?.[slug];
          const hasBadge = badge !== undefined && badge !== "";

          return (
            <Link
              key={slug}
              href={ROUTE_HREFS[slug]}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 font-barlow text-sm font-semibold uppercase tracking-[0.08em] transition-colors sm:px-4",
                isActive
                  ? "border-lfc-red text-white"
                  : "border-transparent text-stadium-muted hover:text-white",
              )}
            >
              <span>{t(`nav.${slug}`)}</span>
              {hasBadge && (
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    isActive ? "text-lfc-gold" : "text-stadium-muted",
                  )}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* ── 2. DataPulseStrip ───────────────────────────────────────────── */

export interface DataPulseItem {
  label: string;
  value: string | number;
  sublabel?: string;
  href?: string;
  accent?: "red" | "gold" | "emerald" | "muted";
}

export interface DataPulseStripProps {
  eyebrow?: string;
  items: DataPulseItem[];
  className?: string;
}

const PULSE_ACCENT_STYLE: Record<NonNullable<DataPulseItem["accent"]>, string> = {
  red: "text-white",
  gold: "text-lfc-gold",
  emerald: "text-white",
  muted: "text-stadium-muted",
};

/** Restrained 1px hairline ledger strip for live season, squad, and editorial figures. */
export function DataPulseStrip({ eyebrow, items, className }: DataPulseStripProps) {
  if (items.length === 0) return null;

  const gridCols =
    items.length === 1
      ? "grid-cols-1"
      : items.length === 2
        ? "grid-cols-2"
        : items.length === 3
          ? "grid-cols-2 sm:grid-cols-3"
          : "grid-cols-2 lg:grid-cols-4";

  return (
    <section aria-label={eyebrow} className={cn("w-full", className)}>
      {eyebrow && (
        <p className="section-label text-stadium-muted mb-2">{eyebrow}</p>
      )}
      <div className={cn("grid gap-px border border-[var(--line)] bg-[var(--line)]", gridCols)}>
        {items.map((item, idx) => {
          const valueColor = PULSE_ACCENT_STYLE[item.accent ?? "red"];
          const cellClass = cn(
            "flex h-full flex-col justify-between bg-[var(--surface-2)] p-3 sm:p-4",
            item.href && "group transition-colors hover:bg-[var(--surface-3)]",
          );

          const body = (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="font-barlow text-xs font-semibold uppercase tracking-[0.12em] text-stadium-muted">
                  {item.label}
                </span>
                {item.href && (
                  <ArrowRight
                    className="size-3.5 shrink-0 text-stadium-muted transition-transform group-hover:translate-x-0.5 group-hover:text-white"
                    aria-hidden
                  />
                )}
              </div>
              <div
                className={cn(
                  "mt-1.5 font-bebas text-2xl sm:text-3xl leading-none tracking-wide tabular-nums",
                  valueColor,
                )}
              >
                {item.value}
              </div>
              {item.sublabel && (
                <p className="mt-1 text-xs leading-snug text-stadium-muted">
                  {item.sublabel}
                </p>
              )}
            </>
          );

          if (item.href) {
            return (
              <Link key={`${item.label}-${idx}`} href={item.href} className={cellClass}>
                {body}
              </Link>
            );
          }

          return (
            <div key={`${item.label}-${idx}`} className={cellClass}>
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── 3. ConnectedPagesGrid ───────────────────────────────────────── */

export interface ConnectedPageCard {
  title: string;
  description: string;
  href: string;
  badge?: string;
  meta?: string;
  accent?: "red" | "gold";
}

export interface ConnectedPagesGridProps {
  eyebrow?: string;
  heading?: string;
  cards: ConnectedPageCard[];
  className?: string;
}

/** Restrained hairline editorial directory connecting related Liverpool pages. */
export function ConnectedPagesGrid({
  eyebrow,
  heading,
  cards,
  className,
}: ConnectedPagesGridProps) {
  if (cards.length === 0) return null;

  return (
    <section aria-label={heading ?? eyebrow} className={cn("w-full border-t border-[var(--line)] pt-6 sm:pt-8", className)}>
      {(eyebrow || heading) && (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          {heading && (
            <h2 className="font-barlow text-sm font-semibold uppercase tracking-[0.14em] text-white">
              {heading}
            </h2>
          )}
          {eyebrow && (
            <span className="font-barlow text-xs font-semibold uppercase tracking-[0.14em] text-stadium-muted">
              {eyebrow}
            </span>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 gap-px border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex h-full flex-col justify-between bg-stadium-bg p-3.5 transition-colors hover:bg-[var(--surface-1)] sm:p-4"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-barlow text-sm font-bold uppercase tracking-[0.08em] text-white transition-colors group-hover:text-lfc-gold">
                  {card.title}
                </h3>
                <ArrowRight
                  className="size-3.5 shrink-0 text-stadium-muted transition-transform group-hover:translate-x-0.5 group-hover:text-white"
                  aria-hidden
                />
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-stadium-muted line-clamp-2">
                {card.description}
              </p>
            </div>
            {card.meta && (
              <p className="mt-2.5 font-barlow text-xs font-semibold uppercase tracking-[0.08em] text-lfc-gold/90 tabular-nums">
                {card.meta}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ── 4. PresetConnectedGrid ──────────────────────────────────────── */

export interface PresetConnectedGridProps {
  preset: ConnectedGridPreset;
  metaOverrides?: Partial<Record<string, string>>;
  className?: string;
}

/** Curated, localized 4-card cross-navigation grid tailored to each Anfield Daily page. */
export async function PresetConnectedGrid({
  preset,
  metaOverrides,
  className,
}: PresetConnectedGridProps) {
  const t = await getTranslations("Hub");
  const entries = PRESET_CARDS[preset];

  const cards: ConnectedPageCard[] = entries.map(({ slug, accent }) => {
    const href = ROUTE_HREFS[slug];
    return {
      title: t(`cards.${slug}.title`),
      description: t(`cards.${slug}.desc`),
      badge: t(`cards.${slug}.badge`),
      href,
      meta: metaOverrides?.[slug] ?? metaOverrides?.[href],
      accent,
    };
  });

  return (
    <ConnectedPagesGrid
      eyebrow={t("eyebrow")}
      heading={t("connectedHeading")}
      cards={cards}
      className={className}
    />
  );
}
