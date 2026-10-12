import { Fragment } from "react";
// Locale-aware Link: plain next/link emitted unprefixed hrefs, which sent
// English readers through a 307 on every footer link.
import { Link } from "@/i18n/navigation";
import { Facebook, Instagram, Twitter, Youtube, Linkedin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { BRAND, brandTagline } from "@/lib/brand";
import { SOURCE_CONFIG } from "@/lib/news-config";
import type { NewsSource } from "@/lib/news-config";
import { BrandLogo } from "./brand-mark";

/* ── Data ────────────────────────────────────────────────────────── */

/** The club's own channels (not ours): the footer says so next to them. */
const SOCIAL_LINKS = [
  { Icon: Facebook, href: "https://facebook.com/LiverpoolFC", label: "Facebook" },
  { Icon: Instagram, href: "https://instagram.com/liverpoolfc", label: "Instagram" },
  { Icon: Twitter, href: "https://twitter.com/lfc", label: "X" },
  { Icon: Youtube, href: "https://youtube.com/liverpoolfc", label: "YouTube" },
  { Icon: Linkedin, href: "https://linkedin.com/company/liverpool-football-club", label: "LinkedIn" },
] as const;

/** Outlets the news feed reads from. Names come from the shared source table. */
const VI_SOURCE_IDS: NewsSource[] = [
  "vnexpress", "tuoitre", "thanhnien", "dantri", "zingnews", "vietnamnet", "bongda", "bongdaplus", "24h",
  "bongda24h", "soha",
];
const EN_SOURCE_IDS: NewsSource[] = [
  "lfc", "bbc", "guardian", "echo", "tia", "anfield-watch", "eotk", "sky", "goal",
];

/**
 * The outlet list, the reader's own language first.
 *
 * It was Vietnamese-first for everyone, which left an English reader looking at
 * eleven Vietnamese mastheads before the first one they recognise.
 */
function sourceIdsFor(locale: string): NewsSource[] {
  return locale === "vi"
    ? [...VI_SOURCE_IDS, ...EN_SOURCE_IDS]
    : [...EN_SOURCE_IDS, ...VI_SOURCE_IDS];
}

/* ── TikTok icon (not in lucide-react) ───────────────────────────── */

function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

/* ── Footer ──────────────────────────────────────────────────────── */

const LINK =
  "inline-flex min-h-11 min-w-11 items-center text-sm font-inter text-stadium-muted hover:text-white transition-colors";
// 44px squares, 12px apart: comfortable for thumbs.
const SOCIAL =
  "size-11 flex items-center justify-center border border-[var(--line)] text-stadium-muted hover:text-white hover:border-lfc-red hover:bg-lfc-red/20 transition-colors";

export function Footer() {
  const t = useTranslations("Footer");
  const navT = useTranslations("Common.nav");
  const locale = useLocale();

  // One list per column; no link appears twice (standings and stats live under "Trận đấu").
  const EXPLORE_LINKS = [
    { href: "/fixtures", label: navT("season") },
    { href: "/squad", label: navT("squad") },
    { href: "/news", label: navT("news") },
    { href: "/history", label: t("club") },
    { href: "/gallery", label: navT("clubGallery") },
  ] as const;
  const INFO_LINKS = [
    { href: "/about", label: navT("about") },
    { href: "/legal", label: t("legal") },
  ] as const;

  return (
    <footer className="relative mt-16">
      <div className="h-px bg-linear-to-r from-transparent via-lfc-red/40 to-transparent" />

      <div className="bg-stadium-surface">
        <div className="page-container py-8 sm:py-10">
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-[1.6fr_1fr_1fr]">
            {/* Brand + the unofficial-site notice: full width on phones */}
            <div className="col-span-2 sm:col-span-1">
              <Link href="/" className="inline-flex min-h-11 items-center text-white" aria-label={BRAND.name}>
                <BrandLogo markClassName="size-9" wordmarkClassName="text-[28px]" />
              </Link>
              <p className="mt-2 max-w-sm font-inter text-sm leading-relaxed text-stadium-muted">{brandTagline(locale)}</p>
              <p className="mt-4 max-w-sm border-l-2 border-lfc-red pl-3 font-inter text-sm leading-relaxed text-white/85">
                {t("disclaimer", { brand: BRAND.name })}
              </p>
            </div>

            <nav aria-label={t("quickLinks")}>
              <h2 className="section-label mb-1 text-white">{t("quickLinks")}</h2>
              <ul>
                {EXPLORE_LINKS.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className={LINK}>{label}</Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label={t("info")}>
              <h2 className="section-label mb-1 text-white">{t("info")}</h2>
              <ul>
                {INFO_LINKS.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className={LINK}>{label}</Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="col-span-2 sm:col-span-3">
              <h2 className="section-label mb-1 text-white">{t("newsSources")}</h2>
              <p className="max-w-3xl font-inter text-sm leading-relaxed text-stadium-muted">
                {/* Names never break across lines ("Liverpool Echo" stays together). */}
                {sourceIdsFor(locale).map((id, i) => (
                  <Fragment key={id}>
                    {i > 0 && " · "}
                    <span className="whitespace-nowrap">{SOURCE_CONFIG[id].label}</span>
                  </Fragment>
                ))}
              </p>
            </div>

            <div className="col-span-2 sm:col-span-3 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="section-label mb-2 text-white">{t("socialLabel")}</h2>
                <div className="flex flex-wrap items-center gap-3">
                  {SOCIAL_LINKS.map(({ Icon, href, label }) => (
                    <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={SOCIAL}>
                      <Icon size={18} aria-hidden />
                    </a>
                  ))}
                  <a href="https://tiktok.com/@liverpoolfc" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className={SOCIAL}>
                    <TikTokIcon size={18} />
                  </a>
                </div>
              </div>
              <div>
                <h2 className="section-label mb-1 text-white">{t("contact")}</h2>
                <a href={`mailto:${BRAND.contactEmail}`} className={LINK}>
                  {BRAND.contactEmail}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border-t border-[var(--line)]">
        <div className="page-container pt-4 pb-safe-nav flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-bebas text-lg text-brand tracking-widest">{t("ynwa")}</p>
          <p className="text-stadium-muted text-xs font-inter sm:text-right">
            &copy; {new Date().getFullYear()} {BRAND.name}. {t("rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
