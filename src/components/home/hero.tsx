import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Newspaper } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { BRAND } from "@/lib/brand";
import { NEWS_OUTLET_COUNT } from "@/lib/news/config";
import type { ReactNode } from "react";

const DEFAULT_HERO_BG = "/assets/lfc/stadium/bg_5.jpg";

interface HeroProps {
  backgroundUrl?: string;
  /** The next-match card; sits beside the headline on desktop, under it on phones. */
  children: ReactNode;
}

/**
 * Compact home hero: stadium photo (the LCP image), a two-line h1
 * ("Wherever you are, / it's Anfield."), one sentence naming the site and what
 * it is best at (news from every outlet, summed up daily) with a way into it, and the next-match
 * card. Server-rendered with CSS-only reveals, so the text is in the first HTML
 * and visible without waiting for hydration.
 */
export async function Hero({ backgroundUrl, children }: HeroProps) {
  const t = await getTranslations("Hero");
  const heroImage = backgroundUrl || DEFAULT_HERO_BG;

  return (
    <header className="relative isolate overflow-hidden border-b border-[var(--line)]">
      <Image
        src={heroImage}
        alt=""
        fill
        priority
        sizes="100vw"
        quality={75}
        unoptimized={heroImage.includes("res.cloudinary.com")}
        className="-z-20 object-cover object-center"
      />
      {/* Top scrim keeps the fixed header legible; the rest keeps text AA on any photo. */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-black/80 via-black/60 to-stadium-bg" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-black/60 to-transparent" />

      <div className="page-container pb-6 pt-[calc(var(--header-h)+1rem)] sm:pb-10 sm:pt-[calc(var(--header-h)+2.5rem)]">
        <div className="grid gap-5 lg:grid-cols-12 lg:items-center lg:gap-12">
          <div className="reveal min-w-0 lg:col-span-7">
            <h1 className="font-bebas text-[3.25rem] leading-[0.9] text-white sm:text-7xl lg:text-8xl">
              <span className="block">{t("headlineTop")}</span>
              <span className="block text-brand">{t("headlineBottom")}</span>
            </h1>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/85 sm:text-base">
              {t.rich("description", {
                brand: BRAND.name,
                count: NEWS_OUTLET_COUNT,
                b: (chunks) => <strong className="font-semibold text-white">{chunks}</strong>,
              })}
            </p>
            <Link
              href="/news"
              className="mt-5 inline-flex min-h-11 items-center gap-2 border border-[var(--line-strong)] bg-black/30 px-4 font-barlow text-sm font-semibold uppercase tracking-[0.1em] text-white backdrop-blur-sm transition-colors hover:border-white/50 hover:bg-white/10 active:bg-white/15"
            >
              <Newspaper className="size-4" aria-hidden />
              {t("ctaNews")}
            </Link>
          </div>
          <div className="reveal reveal-delay-1 min-w-0 lg:col-span-5">{children}</div>
        </div>
      </div>
    </header>
  );
}
