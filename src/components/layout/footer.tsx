import Link from "next/link";
import Image from "next/image";
import {
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Linkedin,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { NewsSourceMarquee } from "./news-source-marquee";

/* ── Data ────────────────────────────────────────────────────────── */


const SOCIAL_LINKS = [
  { Icon: Facebook, href: "https://facebook.com/LiverpoolFC", label: "Facebook" },
  { Icon: Instagram, href: "https://instagram.com/liverpoolfc", label: "Instagram" },
  { Icon: Twitter, href: "https://twitter.com/lfc", label: "X" },
  { Icon: Youtube, href: "https://youtube.com/liverpoolfc", label: "YouTube" },
  { Icon: Linkedin, href: "https://linkedin.com/company/liverpool-football-club", label: "LinkedIn" },
] as const;

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
  "inline-flex min-h-10 min-w-10 items-center text-sm font-inter text-stadium-muted hover:text-white transition-colors";
const SOCIAL =
  "tap-target size-9 flex items-center justify-center border border-[var(--line)] text-stadium-muted hover:text-white hover:border-lfc-red hover:bg-lfc-red/20 transition-colors";

export function Footer() {
  const t = useTranslations("Footer");
  const navT = useTranslations("Common.nav");

  const QUICK_LINKS = [
    { href: "/squad", label: navT("squad") },
    { href: "/season", label: navT("season") },
    { href: "/season?tab=standings", label: navT("standings") },
    { href: "/season?tab=stats", label: navT("stats") },
    { href: "/news", label: navT("news") },
    { href: "/history", label: navT("history") },
  ] as const;
  const LEGAL = [
    { href: "/legal", label: t("legalLinks.privacy") },
    { href: "/legal", label: t("legalLinks.terms") },
    { href: "/about", label: t("legalLinks.about") },
  ] as const;

  return (
    <footer className="relative mt-16">
      <div className="h-px bg-linear-to-r from-transparent via-lfc-red/40 to-transparent" />

      <NewsSourceMarquee />

      <div className="bg-stadium-surface">
        <div className="page-container py-8 sm:py-10">
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-[1.4fr_1fr_1fr]">
            {/* Brand: full width on phones */}
            <div className="col-span-2 sm:col-span-1">
              <Link href="/" className="inline-flex items-center gap-2.5 min-h-10 mb-2" aria-label="LFCVN">
                <Image src="/assets/lfc/crest.webp" alt="" width={28} height={35} className="h-9 w-auto" />
                <span className="font-barlow font-bold uppercase text-base text-white tracking-[0.2em]">LFCVN</span>
              </Link>
              <p className="font-inter text-sm text-stadium-muted leading-relaxed mb-4 max-w-sm">{t("about")}</p>
              <div className="flex flex-wrap items-center gap-2">
                {SOCIAL_LINKS.map(({ Icon, href, label }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={SOCIAL}>
                    <Icon size={16} aria-hidden />
                  </a>
                ))}
                <a href="https://tiktok.com/@liverpoolfc" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className={SOCIAL}>
                  <TikTokIcon size={16} />
                </a>
              </div>
            </div>

            <nav aria-label={t("quickLinks")}>
              <h2 className="section-label text-white mb-2">{t("quickLinks")}</h2>
              <ul>
                {QUICK_LINKS.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className={LINK}>{label}</Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              <h2 className="section-label text-white mb-2">{t("legal")}</h2>
              <ul>
                {LEGAL.map(({ href, label }) => (
                  <li key={label}>
                    <Link href={href} className={LINK}>{label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="col-span-2 sm:col-span-3">
              <h2 className="section-label text-white mb-2">{t("contact")}</h2>
              <a href="mailto:nguyendangdinh47@gmail.com" className={LINK}>
                nguyendangdinh47@gmail.com
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border-t border-[var(--line)]">
        <div className="page-container pt-4 pb-24 lg:pb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-bebas text-lg text-brand tracking-widest">{t("ynwa")}</p>
          <div className="text-stadium-muted text-xs font-inter sm:text-right">
            <p>&copy; {new Date().getFullYear()} {t("rights")}</p>
            <p>{t("disclaimer")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
