import { useTranslations } from "next-intl";

/** First tab stop on every page: jumps keyboard users past the header. */
export function SkipLink() {
  const t = useTranslations("Common");
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:bg-lfc-red focus:px-4 focus:py-2.5 focus:font-barlow focus:text-sm focus:font-bold focus:uppercase focus:tracking-[0.12em] focus:text-white"
    >
      {t("skipToContent")}
    </a>
  );
}
