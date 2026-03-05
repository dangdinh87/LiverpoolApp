import Link from "next/link";
import Image from "next/image";
import {
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Linkedin,
} from "lucide-react";

/* ── Data ────────────────────────────────────────────────────────── */

const QUICK_LINKS = [
  { href: "/squad", label: "Squad" },
  { href: "/season", label: "Season" },
  { href: "/season?tab=standings", label: "Standings" },
  { href: "/season?tab=stats", label: "Stats" },
  { href: "/news", label: "News" },
  { href: "/history", label: "The Club" },
] as const;

const LEGAL_LINKS = [
  { href: "/legal", label: "Privacy Policy" },
  { href: "/legal", label: "Terms of Use" },
  { href: "/legal", label: "Cookie Policy" },
  { href: "/about", label: "About" },
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
  return (
    <footer className="relative mt-20 overflow-hidden">
      {/* Subtle top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-lfc-red/40 to-transparent" />

      {/* Main footer content */}
      <div className="bg-stadium-surface">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Brand column */}
            <div className="md:col-span-1">
              <Link href="/" className="inline-flex items-center gap-2.5 group mb-4">
                <Image
                  src="/assets/lfc/crest.webp"
                  alt="Liverpool FC"
                  width={32}
                  height={40}
                  className="h-10 w-auto opacity-80 group-hover:opacity-100 transition-opacity"
                />
                <span className="font-bebas text-xl text-white tracking-wider">
                  Liverpool FC
                </span>
              </Link>
              <p className="font-inter text-sm text-stadium-muted leading-relaxed">
                A fan-made hub for everything Liverpool FC — results, stats, squad, and more.
              </p>

              {/* Social row */}
              <div className="flex items-center gap-2 mt-5">
                {SOCIAL_LINKS.map(({ Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="w-8 h-8 rounded-full bg-stadium-surface2 flex items-center justify-center text-stadium-muted hover:text-white hover:bg-lfc-red/80 transition-all duration-200"
                  >
                    <Icon size={14} />
                  </a>
                ))}
                <a
                  href="https://tiktok.com/@liverpoolfc"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="w-8 h-8 rounded-full bg-stadium-surface2 flex items-center justify-center text-stadium-muted hover:text-white hover:bg-lfc-red/80 transition-all duration-200"
                >
                  <TikTokIcon size={14} />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-barlow font-semibold text-white uppercase tracking-wider text-xs mb-4">
                Quick Links
              </h3>
              <ul className="space-y-2.5">
                {QUICK_LINKS.map(({ href, label }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-stadium-muted hover:text-white text-sm font-inter transition-colors inline-flex items-center gap-1.5 group"
                    >
                      <span className="w-0 group-hover:w-2 h-px bg-lfc-red transition-all duration-200" />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="font-barlow font-semibold text-white uppercase tracking-wider text-xs mb-4">
                Legal
              </h3>
              <ul className="space-y-2.5">
                {LEGAL_LINKS.map(({ href, label }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-stadium-muted hover:text-white text-sm font-inter transition-colors inline-flex items-center gap-1.5 group"
                    >
                      <span className="w-0 group-hover:w-2 h-px bg-lfc-red transition-all duration-200" />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="font-barlow font-semibold text-white uppercase tracking-wider text-xs mb-4">
                Contact
              </h3>
              <div className="space-y-1.5 text-stadium-muted text-sm font-inter">
                <p>Anfield Road</p>
                <p>Liverpool, L4 0TH</p>
                <p>United Kingdom</p>
                <p className="mt-3">
                  <a
                    href="mailto:contactus@liverpoolfc.com"
                    className="hover:text-white transition-colors underline underline-offset-2 decoration-stadium-border hover:decoration-lfc-red"
                  >
                    contactus@liverpoolfc.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-[#111111] border-t border-stadium-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="font-bebas text-base text-lfc-red/80 tracking-widest">
              You&apos;ll Never Walk Alone
            </p>
            <div className="flex flex-col items-center sm:items-end gap-1">
              <p className="text-stadium-muted text-xs font-inter">
                &copy; {new Date().getFullYear()} Liverpool FC Fan Site. Fan-made &amp; unofficial.
              </p>
              <p className="text-stadium-muted/60 text-[10px] font-inter">
                Not affiliated with Liverpool FC or FSG. Data by Fantasy Premier League & Football-Data.org. News via BBC Sport RSS.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
