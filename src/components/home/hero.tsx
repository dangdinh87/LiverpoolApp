"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";

/**
 * Hero — the anthem rendered as Anfield signage.
 *
 * The previous version split the headline into individual <span> letters, each
 * with a 3D entrance, an infinite bounce and a per-letter hover that scaled,
 * rotated and applied a neon text-shadow. That reads as a template flourish
 * rather than a club, and it broke the text itself: screen readers announced
 * the anthem letter by letter, and `select-none` meant nobody could copy it.
 *
 * The wrought-iron lettering above the Shankly Gates does not bounce. It is
 * still, heavy, and slightly weathered. So the headline is now real selectable
 * text that arrives once, per line, and then holds — the composition carries
 * the weight instead of the animation.
 */

const DEFAULT_HERO_BG = "/assets/lfc/stadium/bg_5.jpg";

interface HeroProps {
  backgroundUrl?: string;
}

export function Hero({ backgroundUrl }: HeroProps) {
  const t = useTranslations("Hero");
  const reduceMotion = useReducedMotion();
  const heroImage = backgroundUrl || DEFAULT_HERO_BG;
  const isCloudinaryHero = heroImage.includes("res.cloudinary.com");

  // One reveal on load, staggered by line. Nothing loops.
  const rise = (delay: number) =>
    reduceMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } }
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <section className="relative h-screen min-h-[600px] overflow-hidden snap-start">
      <Image
        src={heroImage}
        alt="Anfield Stadium"
        fill
        priority
        fetchPriority="high"
        className="object-cover object-center"
        sizes="100vw"
        quality={85}
        unoptimized={isCloudinaryHero}
      />

      {/* Weight the lower-left so the type sits on solid ground, and keep the
          stands legible on the right rather than flattening the whole frame. */}
      <div className="absolute inset-0 bg-gradient-to-t from-stadium-bg via-stadium-bg/55 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-stadium-bg/85 via-stadium-bg/25 to-transparent" />

      {/* Content sits on a baseline rule, left-anchored like gate signage
          rather than floating in the centre of the viewport. */}
      <div className="relative z-10 h-full mx-auto w-full max-w-6xl px-6 sm:px-10">
        <div className="flex h-full flex-col justify-end pb-20 sm:pb-24">
          <motion.div {...rise(0)} className="flex items-center gap-3">
            <Image
              src="/assets/lfc/crest.webp"
              alt="Liverpool FC Crest"
              width={34}
              height={42}
              sizes="34px"
              className="h-[42px] w-auto"
            />
            <p className="font-barlow text-[0.68rem] sm:text-xs uppercase tracking-[0.42em] text-lfc-gold">
              {t("tagline")}
            </p>
          </motion.div>

          {/* Real text: selectable, announced as one phrase, no per-letter spans. */}
          <h1 className="mt-5 font-bebas leading-[0.82] tracking-[0.01em] text-[3.4rem] sm:text-7xl md:text-8xl lg:text-[8.5rem]">
            <motion.span {...rise(0.1)} className="block text-white">
              You&rsquo;ll Never
            </motion.span>
            <motion.span {...rise(0.22)} className="block text-lfc-red">
              Walk Alone
            </motion.span>
          </h1>

          <motion.div
            {...rise(0.36)}
            className="mt-7 flex flex-col gap-5 border-t border-white/15 pt-5 sm:flex-row sm:items-baseline sm:justify-between"
          >
            <p className="max-w-md font-inter text-[0.95rem] leading-relaxed text-white/70">
              {t("description")}
            </p>
            <p className="font-barlow text-[0.68rem] uppercase tracking-[0.3em] text-white/45 whitespace-nowrap">
              {t("badge")}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
