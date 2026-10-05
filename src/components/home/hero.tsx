import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

const DEFAULT_HERO_BG = "/assets/lfc/stadium/bg_5.jpg";

interface HeroProps {
  backgroundUrl?: string;
  /** The next-match card; sits beside the headline on desktop, under it on phones. */
  children: ReactNode;
}

/**
 * Compact home hero: stadium photo (the LCP image), the anthem as the one h1,
 * and the next-match card. Server-rendered with CSS-only reveals, so the text
 * is in the first HTML and visible without waiting for hydration.
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
            <p className="section-label text-lfc-gold">{t("tagline")}</p>
            <h1 className="mt-2 font-bebas text-[3.25rem] leading-[0.9] text-white sm:text-7xl lg:text-8xl">
              You&rsquo;ll Never <span className="text-brand">Walk Alone</span>
            </h1>
            <p className="mt-3 hidden max-w-md text-base text-white/80 sm:block">{t("description")}</p>
          </div>
          <div className="reveal reveal-delay-1 min-w-0 lg:col-span-5">{children}</div>
        </div>
      </div>
    </header>
  );
}
