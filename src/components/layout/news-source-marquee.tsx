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

function LogoItem({ source, hidden }: { source: SourceLogo; hidden?: boolean }) {
  const isLFC = source.key === "liverpoolfc";
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={source.label}
      tabIndex={hidden ? -1 : undefined}
      className="flex-shrink-0 mx-4 sm:mx-6 flex items-center justify-center gap-2 px-3 py-2 transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100 opacity-70"
    >
      <Image
        src={source.logo}
        alt={source.label}
        width={source.width}
        height={source.height}
        className={`${isLFC ? "h-7 sm:h-9" : "h-6 sm:h-8"} w-auto object-contain brightness-150 contrast-125`}
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

/* ── Marquee: pure CSS (compositor-only transform), no per-frame JS ── */

export function NewsSourceMarquee() {
  const t = useTranslations("Footer");

  return (
    <div className="bg-white/5 border-t border-white/10 pt-5 pb-3">
      <p className="text-center text-stadium-muted text-sm font-bebas uppercase tracking-[0.2em] mb-3">
        {t("newsSources")}
      </p>

      {/* Two identical halves; the track slides by exactly one half, then loops.
          Pauses on hover/focus. Reduced motion: static, scrollable row. */}
      <div className="news-marquee overflow-hidden">
        <div className="news-marquee-track flex w-max">
          {[false, true].map((dup) => (
            <div key={String(dup)} className="flex shrink-0" aria-hidden={dup || undefined}>
              {NEWS_SOURCES.map((s) => (
                <LogoItem key={s.key} source={s} hidden={dup} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
