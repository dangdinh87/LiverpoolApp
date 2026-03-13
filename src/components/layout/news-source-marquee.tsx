"use client";

import { useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

/* ── Logo config for all supported news sources ──────────────────── */

interface SourceLogo {
  key: string;
  label: string;
  logo: string;
  width: number;
  height: number;
  url: string;
}

const NEWS_SOURCES: SourceLogo[] = [
  // Vietnamese sources
  { key: "vnexpress", label: "VnExpress", logo: "/assets/news/logos/vnexpress.svg", width: 140, height: 40, url: "https://vnexpress.net" },
  { key: "tuoitre", label: "Tuổi Trẻ", logo: "/assets/news/logos/tuoitre.svg", width: 120, height: 40, url: "https://tuoitre.vn" },
  { key: "thanhnien", label: "Thanh Niên", logo: "/assets/news/logos/thanhnien2.svg", width: 130, height: 40, url: "https://thanhnien.vn" },
  { key: "dantri", label: "Dân Trí", logo: "/assets/news/logos/dantri.png", width: 110, height: 40, url: "https://dantri.com.vn" },
  { key: "vietnamnet", label: "VietNamNet", logo: "/assets/news/logos/vietnamnet.svg", width: 120, height: 40, url: "https://vietnamnet.vn" },
  { key: "24h", label: "24h", logo: "/assets/news/logos/24h.svg", width: 80, height: 40, url: "https://www.24h.com.vn" },
  { key: "bongda", label: "Bóng Đá", logo: "/assets/news/logos/bongda.png", width: 100, height: 40, url: "https://bongda.com.vn" },
  { key: "bongdaplus", label: "Bóng Đá+", logo: "/assets/news/logos/bongdaplus.png", width: 80, height: 40, url: "https://bongdaplus.vn" },
  { key: "webthethao", label: "Webthethao", logo: "/assets/news/logos/webthethao.png", width: 120, height: 40, url: "https://webthethao.vn" },
  { key: "vietnamvn", label: "Vietnam.vn", logo: "/assets/news/logos/vietnamvn.png", width: 120, height: 40, url: "https://www.vietnam.vn" },
  // English sources
  { key: "bbc", label: "BBC Sport", logo: "/assets/news/logos/bbc.svg", width: 120, height: 40, url: "https://www.bbc.com/sport" },
  { key: "guardian", label: "The Guardian", logo: "/assets/news/logos/guardian.svg", width: 140, height: 40, url: "https://www.theguardian.com" },
  { key: "echo", label: "Liverpool Echo", logo: "/assets/news/logos/echo.png", width: 200, height: 40, url: "https://www.liverpoolecho.co.uk" },
  { key: "anfield-watch", label: "Anfield Watch", logo: "/assets/news/logos/anfield-watch.svg", width: 160, height: 40, url: "https://www.anfieldwatch.co.uk" },
  { key: "eotk", label: "Empire of the Kop", logo: "/assets/news/logos/eotk.svg", width: 150, height: 40, url: "https://www.empireofthekop.com" },
  { key: "goal", label: "GOAL", logo: "/assets/news/logos/goal.svg", width: 100, height: 40, url: "https://www.goal.com" },
  { key: "liverpoolfc", label: "LiverpoolFC.com", logo: "/assets/lfc/crest.webp", width: 40, height: 40, url: "https://www.liverpoolfc.com" },
];

/* ── Single logo item ────────────────────────────────────────────── */

function LogoItem({ source }: { source: SourceLogo }) {
  const isLFC = source.key === "liverpoolfc";
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={source.label}
      className="flex-shrink-0 mx-4 sm:mx-6 flex items-center justify-center gap-2 px-3 py-2 transition-all duration-300 hover:scale-105 hover:opacity-100 opacity-70"
    >
      <Image
        src={source.logo}
        alt={source.label}
        width={source.width}
        height={source.height}
        className={`${isLFC ? "h-7 sm:h-9" : "h-6 sm:h-8"} w-auto object-contain brightness-150 contrast-125 transition-all duration-300`}
        unoptimized
      />
      {isLFC && (
        <span className="font-bebas text-base sm:text-lg text-white tracking-wider leading-none">
          LiverpoolFC
        </span>
      )}
    </a>
  );
}

/* ── Marquee with manual scroll + infinite auto-scroll ───────────── */

export function NewsSourceMarquee() {
  const t = useTranslations("Footer");
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Infinite loop: when scrolled past halfway, jump back seamlessly
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const half = el.scrollWidth / 2;
    if (el.scrollLeft >= half) {
      el.scrollLeft -= half;
    } else if (el.scrollLeft <= 0) {
      el.scrollLeft += half;
    }
  }, []);

  // Auto-scroll with requestAnimationFrame
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let rafId: number;
    const speed = 0.5; // px per frame

    const tick = () => {
      if (autoScrollRef.current && el) {
        el.scrollLeft += speed;
        // Infinite loop reset
        const half = el.scrollWidth / 2;
        if (el.scrollLeft >= half) {
          el.scrollLeft -= half;
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Pause auto-scroll on user interaction, resume after 3s idle
  const pauseAutoScroll = useCallback(() => {
    autoScrollRef.current = false;
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => {
      autoScrollRef.current = true;
    }, 3000);
  }, []);

  return (
    <div className="bg-white/5 border-t border-white/10 pt-6 pb-4">
      {/* Description */}
      <p className="text-center text-stadium-muted text-xs font-barlow uppercase tracking-[0.15em] mb-4">
        {t("newsSources")}
      </p>

      {/* Scrollable track — manual drag + auto-scroll */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onPointerDown={pauseAutoScroll}
        onWheel={pauseAutoScroll}
        onTouchStart={pauseAutoScroll}
        className="flex overflow-x-auto scrollbar-none cursor-grab active:cursor-grabbing"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {/* Duplicate items 3x for seamless infinite loop */}
        {[0, 1, 2].map((i) =>
          NEWS_SOURCES.map((s) => (
            <LogoItem key={`${i}-${s.key}`} source={s} />
          ))
        )}
      </div>
    </div>
  );
}
