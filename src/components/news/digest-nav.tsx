import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { formatMatchDayMonth } from "@/lib/format-match-date";

const label = (date: string, locale: string) =>
  formatMatchDayMonth(new Date(`${date}T00:00:00+07:00`), locale === "vi" ? "vi" : "en");

const CARD = "flex min-h-[76px] flex-col justify-center gap-1 px-4 py-3";

/**
 * Previous (older) / next (newer) digest. Two big halves at the end of the page,
 * where the thumb already is. A missing side says why instead of leaving a gap.
 * Renders nothing when there is neither.
 */
export async function DigestNav({ prev, next }: { prev?: string; next?: string }) {
  if (!prev && !next) return null;
  const [t, locale] = await Promise.all([getTranslations("News.digest"), getLocale()]);
  const kicker = "flex items-center gap-1.5 font-barlow text-xs font-semibold uppercase tracking-[0.12em] text-stadium-muted";

  return (
    <nav aria-label={t("navLabel")} className="mt-12 grid grid-cols-2 gap-3">
      {prev ? (
        <Link href={`/news/digest/${prev}`} rel="prev" className={`surface-interactive ${CARD}`}>
          <span className={kicker}>
            <ArrowLeft className="size-4" aria-hidden />
            {t("prevDay")}
          </span>
          <span className="text-base font-semibold text-white">{label(prev, locale)}</span>
        </Link>
      ) : (
        <p className={`${CARD} border border-dashed border-[var(--line)] text-sm text-stadium-muted`}>{t("oldestHint")}</p>
      )}
      {next ? (
        <Link href={`/news/digest/${next}`} rel="next" className={`surface-interactive ${CARD} items-end text-right`}>
          <span className={kicker}>
            {t("nextDay")}
            <ArrowRight className="size-4" aria-hidden />
          </span>
          <span className="text-base font-semibold text-white">{label(next, locale)}</span>
        </Link>
      ) : (
        <p className={`${CARD} items-end border border-dashed border-[var(--line)] text-right text-sm text-stadium-muted`}>{t("latestHint")}</p>
      )}
    </nav>
  );
}
