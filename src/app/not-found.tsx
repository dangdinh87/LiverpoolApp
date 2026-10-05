import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";

export default function NotFound() {
  const t = useTranslations("Common");
  const nav = useTranslations("Common.nav");

  const links = [
    { href: "/news", label: nav("news") },
    { href: "/season", label: nav("season") },
    { href: "/squad", label: nav("squad") },
    { href: "/stats", label: nav("stats") },
  ];

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 pt-[calc(var(--header-h)+1rem)] pb-16 text-center">
      <Image src="/assets/lfc/crest.webp" alt="" width={64} height={80} className="opacity-30 mb-5 h-16 w-auto reveal" />

      <p aria-hidden className="font-bebas text-[112px] sm:text-[160px] leading-[0.85] text-lfc-red/30 tracking-wider select-none reveal">
        404
      </p>
      <h1 className="font-bebas text-4xl sm:text-5xl text-white tracking-wider mt-2 mb-2 reveal reveal-delay-1">
        {t("notFoundTitle")}
      </h1>
      <p className="text-stadium-muted text-[15px] max-w-md mb-7 reveal reveal-delay-1">{t("notFoundMessage")}</p>

      <Link
        href="/"
        className="min-h-11 inline-flex items-center px-8 bg-lfc-red text-white font-barlow font-bold uppercase tracking-[0.12em] text-sm hover:bg-lfc-red-dark transition-colors reveal reveal-delay-2"
      >
        {t("backHome")}
      </Link>

      <nav aria-label={t("notFoundHint")} className="mt-8 reveal reveal-delay-3">
        <p className="section-label text-stadium-muted mb-2">{t("notFoundHint")}</p>
        <ul className="flex flex-wrap justify-center gap-x-1">
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="min-h-11 inline-flex items-center px-3 font-barlow font-semibold uppercase tracking-[0.12em] text-sm text-white/80 hover:text-white transition-colors"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
