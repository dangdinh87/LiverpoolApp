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


const LEGAL_LINKS = [
  { href: "/legal", labelKey: "privacy" },
  { href: "/legal", labelKey: "terms" },
  { href: "/legal", labelKey: "cookie" },
  { href: "/about", labelKey: "about" },
] as const;

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
    >
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

/* ── Footer ──────────────────────────────────────────────────────── */

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
  return (
    <footer className="relative mt-20">
      {/* Top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-lfc-red/40 to-transparent" />

      {/* News sources marquee */}
      <NewsSourceMarquee />

      {/* Main content */}
      <div className="bg-stadium-surface">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">

            {/* Col 1: Brand */}
            <div>
              <Link href="/" className="inline-flex items-center gap-2 group mb-3">
                <Image
                  src="/assets/lfc/crest.webp"
                  alt="Liverpool FC"
                  width={28}
                  height={35}
                  className="h-9 w-auto opacity-80 group-hover:opacity-100 transition-opacity"
                />
                <span className="font-barlow font-bold uppercase text-base text-white tracking-[0.2em]">
                  LFCVN
                </span>
              </Link>
              <p className="font-inter text-xs text-stadium-muted leading-relaxed mb-4">
                {t("about")}
              </p>
              <div className="flex items-center gap-1.5">
                {SOCIAL_LINKS.map(({ Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="w-7 h-7 rounded-full bg-stadium-surface2 flex items-center justify-center text-stadium-muted hover:text-white hover:bg-lfc-red/70 transition-all duration-200"
                  >
                    <Icon size={13} />
                  </a>
                ))}
                <a
                  href="https://tiktok.com/@liverpoolfc"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="w-7 h-7 rounded-full bg-stadium-surface2 flex items-center justify-center text-stadium-muted hover:text-white hover:bg-lfc-red/70 transition-all duration-200"
                >
                  <TikTokIcon size={13} />
                </a>
              </div>
            </div>

            {/* Col 2: Quick links */}
            <div>
              <h3 className="font-bebas text-white uppercase tracking-wider text-sm mb-3">
                {t("quickLinks")}
              </h3>
              <ul className="space-y-2">
                {QUICK_LINKS.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-stadium-muted hover:text-white text-xs font-inter transition-colors inline-flex items-center gap-1.5 group"
                    >
                      <span className="w-0 group-hover:w-2 h-px bg-lfc-red transition-all duration-200" />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3: Legal + Contact */}
            <div className="flex flex-col gap-6">
              <div>
                <h3 className="font-bebas text-white uppercase tracking-wider text-sm mb-3">
                  {t("legal")}
                </h3>
                <ul className="space-y-2">
                  {[
                    { href: "/legal", label: t("legalLinks.privacy") },
                    { href: "/legal", label: t("legalLinks.terms") },
                    { href: "/about", label: t("legalLinks.about") },
                  ].map(({ href, label }) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="text-stadium-muted hover:text-white text-xs font-inter transition-colors inline-flex items-center gap-1.5 group"
                      >
                        <span className="w-0 group-hover:w-2 h-px bg-lfc-red transition-all duration-200" />
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-bebas text-white uppercase tracking-wider text-sm mb-3">
                  {t("contact")}
                </h3>
                <div className="space-y-1 text-xs font-inter text-stadium-muted">
                  <a href="mailto:nguyendangdinh47@gmail.com" className="block hover:text-white transition-colors">
                    nguyendangdinh47@gmail.com
                  </a>
                  <a href="tel:0977963775" className="block hover:text-white transition-colors">
                    0977 963 775
                  </a>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-[#0a0a0a] border-t border-stadium-border/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="font-bebas text-base text-lfc-red/80 tracking-widest">
              {t("ynwa")}
            </p>
            <div className="flex flex-col items-center sm:items-end gap-0.5">
              <p className="text-stadium-muted text-xs font-inter">
                &copy; {new Date().getFullYear()} {t("rights")}
              </p>
              <p className="text-stadium-muted/60 text-[11px] font-inter">
                {t("disclaimer")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
