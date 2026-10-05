import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { formatDayMonthYear } from "@/lib/format-match-date";

const label = (date: string, locale: string) =>
  formatDayMonthYear(new Date(`${date}T00:00:00+07:00`), locale === "vi" ? "vi" : "en");

/** Previous (older) / next (newer) briefing links. Renders nothing when neither exists. */
export async function DigestNav({ prev, next }: { prev?: string; next?: string }) {
  if (!prev && !next) return null;
  const [t, locale] = await Promise.all([getTranslations("News.digest"), getLocale()]);
  const base =
    "surface-interactive flex min-h-16 flex-1 flex-col justify-center gap-0.5 px-4 py-3";

  return (
    <nav aria-label={t("navLabel")} className="mt-10 flex gap-3">
      {prev ? (
        <Link href={`/news/digest/${prev}`} rel="prev" className={base}>
          <span className="flex items-center gap-1.5 font-barlow text-xs font-semibold uppercase tracking-[0.12em] text-stadium-muted">
            <ArrowLeft className="size-3.5" aria-hidden />
            {t("prevDay")}
          </span>
          <span className="text-[15px] font-semibold text-white">{label(prev, locale)}</span>
        </Link>
      ) : (
        <span className="flex-1" />
      )}
      {next ? (
        <Link href={`/news/digest/${next}`} rel="next" className={`${base} items-end text-right`}>
          <span className="flex items-center gap-1.5 font-barlow text-xs font-semibold uppercase tracking-[0.12em] text-stadium-muted">
            {t("nextDay")}
            <ArrowRight className="size-3.5" aria-hidden />
          </span>
          <span className="text-[15px] font-semibold text-white">{label(next, locale)}</span>
        </Link>
      ) : (
        <span className="flex-1" />
      )}
    </nav>
  );
}
