import Image from "next/image";
import { getTranslations } from "next-intl/server";
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
 * Home hero: stadium photo (the LCP image), the strapline, one sentence saying
 * what the site does, a way into the news, and the next-match card.
 *
 * Deliberately small type. This block is the site talking about itself, and it
 * used to open at 52px on a phone and 96px on a desktop — two lines of
 * slogan, a paragraph and a button before a single headline. On a site whose
 * whole proposition is reading the news quickly, the largest words on the home
 * page should be today's story, not the pitch for the site; the briefing
 * headline directly below now carries that weight. Shrinking this lifts the
 * first real headline roughly a third of a screen up the page on a phone.
 *
 * Keep this smaller than the briefing headline at every width (that one is
 * 34px, then 48px from `sm`). At 48px here the two tied on desktop and neither
 * read as the page's lead.
 *
 * Server-rendered with CSS-only reveals, so the text is in the first HTML and
 * visible without waiting for hydration.
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
      {/* Light scrims: enough for the fixed header and AA text on the left, while the stadium still reads as a photo. */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-black/60 via-black/25 to-stadium-bg" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />

      <div className="page-container pb-5 pt-[calc(var(--header-h)+0.75rem)] sm:pb-6 sm:pt-[calc(var(--header-h)+1.25rem)]">
        <div className="grid gap-5 lg:grid-cols-12 lg:items-center lg:gap-12">
          <div className="reveal min-w-0 lg:col-span-7">
            <h1 className="font-serif text-[1.75rem] font-semibold leading-[1.08] tracking-tight text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.5)] sm:text-[2rem] lg:text-4xl">
              {/* Two set lines, never a free wrap: left to wrap, the red half broke with one word ("place.") alone on line two. */}
              <span className="block">{t("headlineTop")}</span>
              <span className="block text-brand">{t("headlineBottom")}</span>
            </h1>
            <p className="mt-2.5 max-w-lg text-[13px] leading-relaxed text-white/85 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)] sm:text-sm">
              {t.rich("description", {
                brand: BRAND.name,
                count: NEWS_OUTLET_COUNT,
                b: (chunks) => <strong className="font-semibold text-white">{chunks}</strong>,
              })}
            </p>
          </div>
          <div className="reveal reveal-delay-1 min-w-0 lg:col-span-5">{children}</div>
        </div>
      </div>
    </header>
  );
}
