import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { BRAND } from "@/lib/brand";
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
      {/* Strong scrims: keep the stadium visible while holding crisp AA contrast behind headline and copy. */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-black/80 via-black/55 to-stadium-bg" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-black/85 via-black/60 to-black/20" />
      <Image
        src="/assets/lfc/crest.webp"
        alt=""
        width={260}
        height={312}
        className="pointer-events-none select-none absolute -right-10 -bottom-10 -z-10 hidden w-56 opacity-[0.07] sm:block lg:right-[36%] lg:w-64"
      />

      <div className="page-container pb-5 pt-[calc(var(--header-h)+0.75rem)] sm:pb-6 sm:pt-[calc(var(--header-h)+1.25rem)]">
        <div className="grid gap-5 lg:grid-cols-12 lg:items-center lg:gap-12">
          <div className="reveal min-w-0 lg:col-span-7">
            <div className="flex items-start gap-3.5 sm:gap-4">
              <Image
                src="/assets/lfc/crest.webp"
                alt=""
                width={48}
                height={58}
                priority
                className="mt-0.5 h-12 w-10 shrink-0 object-contain drop-shadow-[0_4px_14px_rgba(0,0,0,0.75)] sm:h-14 sm:w-12"
              />
              <div className="min-w-0">
                <h1 className="font-sans text-[1.75rem] font-extrabold leading-[1.12] tracking-[-0.025em] text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.85)] sm:text-[2.15rem] lg:text-[2.5rem]">
                  <span className="block text-white">{t("headlineTop")}</span>
                  <span className="block text-white/85">{t("headlineBottom")}</span>
                </h1>
                <span aria-hidden className="mt-2.5 block h-[3px] w-12 bg-lfc-red" />
              </div>
            </div>
            <p className="mt-2.5 max-w-lg text-[13px] leading-relaxed text-white/95 [text-shadow:0_1px_10px_rgba(0,0,0,0.8)] sm:text-sm">
              {t.rich("description", {
                brand: BRAND.name,
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
