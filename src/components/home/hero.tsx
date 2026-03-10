"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Mouse, Heart } from "lucide-react";
import { useTranslations } from "next-intl";

/* ── Hover effect variants for individual letters ─────────────── */
const HOVER_EFFECTS = [
  { y: -10, scale: 1.15, rotate: 0 },
  { y: -8, scale: 1.2, rotate: -4 },
  { y: -12, scale: 1.1, rotate: 3 },
  { y: -6, scale: 1.25, rotate: 0 },
  { y: -10, scale: 1.15, rotate: -2 },
] as const;

/* White letters glow red, red letters glow gold */
const WHITE_GLOW = "0 0 20px rgba(200,16,46,0.8), 0 0 40px rgba(200,16,46,0.4)";
const RED_GLOW = "0 0 20px rgba(246,235,97,0.8), 0 0 40px rgba(246,235,97,0.4)";

interface LetterProps {
  char: string;
  globalIdx: number;
  isRed: boolean;
}

function AnimatedLetter({ char, globalIdx, isRed }: LetterProps) {
  const hover = HOVER_EFFECTS[globalIdx % HOVER_EFFECTS.length];

  return (
    <motion.span
      initial={{ opacity: 0, y: 50, rotateX: 90, scale: 0.5 }}
      animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: 0.3 + globalIdx * 0.04,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{
        y: hover.y,
        scale: hover.scale,
        rotate: hover.rotate,
        textShadow: isRed ? RED_GLOW : WHITE_GLOW,
        color: isRed ? "#F6EB61" : "#ffffff",
        transition: { type: "spring", stiffness: 400, damping: 15 },
      }}
      className="inline-block origin-bottom cursor-default select-none"
    >
      {char}
    </motion.span>
  );
}

/* ── Line config ──────────────────────────────────────────────── */
const LINES = [
  { words: ["YOU'LL", "NEVER"], isRed: false, startIdx: 0 },
  { words: ["WALK", "ALONE"], isRed: true, startIdx: "YOU'LLNEVER".length },
] as const;

export function Hero() {
  const t = useTranslations("Hero");
  return (
    <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden snap-start">
      {/* Background image with slow zoom */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 animate-[subtleZoom_25s_infinite_alternate]"
        style={{
          backgroundImage: `url('/assets/lfc/stadium/anfield-champions-league.webp')`,
        }}
      />

      {/* Lighter overlays — let more image show through */}
      <div className="absolute inset-0 bg-gradient-to-t from-stadium-bg via-stadium-bg/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-stadium-bg/60 via-transparent to-transparent h-28" />
      <div className="absolute inset-0 bg-black/10" />

      {/* Large watermark text in the background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <span
          className="font-bebas text-[20vw] text-white/[0.03] leading-none tracking-[0.15em] select-none whitespace-nowrap"
        >
          LIVERPOOL
        </span>
      </div>

      {/* Red accent line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-lfc-red to-transparent" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        {/* Club crest */}
        <motion.div
          className="mb-5"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Image
            src="/assets/lfc/crest.webp"
            alt="Liverpool FC Crest"
            width={64}
            height={80}
            className="mx-auto drop-shadow-[0_0_30px_rgba(200,16,46,0.4)]"
            priority
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="font-barlow text-lfc-red uppercase tracking-[0.3em] text-sm font-semibold mb-4 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
        >
          {t("tagline")}
        </motion.p>

        {/* YNWA Headline — per-letter animation + hover + scroll indicator */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 mb-6">
          <h1
            className="font-bebas text-6xl sm:text-7xl md:text-8xl lg:text-[9rem] leading-none tracking-[0.02em]"
            style={{
              perspective: "1000px",
              textShadow: "0 4px 30px rgba(0,0,0,0.6), 0 2px 10px rgba(0,0,0,0.4)",
            }}
          >
            {LINES.map(({ words, isRed, startIdx }) => (
              <span
                key={words.join("")}
                className={`flex justify-center gap-[0.15em] flex-wrap ${isRed ? "text-lfc-red" : "text-white"}`}
                style={isRed ? { textShadow: "0 4px 30px rgba(200,16,46,0.5), 0 2px 10px rgba(0,0,0,0.4)" } : undefined}
              >
                {words.map((word, wi) => (
                  <span key={word} className="inline-flex">
                    {word.split("").map((char, ci) => {
                      const prevChars = words.slice(0, wi).join("").length;
                      const globalIdx = startIdx + prevChars + ci;
                      return (
                        <AnimatedLetter
                          key={`${word}-${ci}`}
                          char={char}
                          globalIdx={globalIdx}
                          isRed={isRed}
                        />
                      );
                    })}
                    {/* Space between words */}
                    {wi < words.length - 1 && <span className="w-[0.15em]" />}
                  </span>
                ))}
              </span>
            ))}
          </h1>

          {/* Scroll indicator — right of YNWA */}
          <motion.div
            className="text-white/50 flex flex-col items-center gap-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3, duration: 0.5 }}
          >
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Mouse className="w-5 h-5" />
            </motion.div>
            <span className="font-barlow text-[10px] uppercase tracking-widest">{t("scroll")}</span>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.0 }}
          className="text-white/80 font-inter text-lg max-w-md mx-auto mb-6 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
        >
          {t("description")}
        </motion.p>

        {/* Fansite badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 1.2 }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/40 border border-white/10 rounded-full backdrop-blur-md"
        >
          <Heart size={12} className="text-lfc-red fill-lfc-red" />
          <span className="font-barlow text-xs text-white/70 uppercase tracking-wider">
            {t("badge")}
          </span>
        </motion.div>
      </div>

    </section>
  );
}
