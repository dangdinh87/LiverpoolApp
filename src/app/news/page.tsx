import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { getNewsFromDB } from "@/lib/news";
import { NewsFeed } from "@/components/news/news-feed";
import { makePageMeta } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("News.metadata");
  const title = t("title");
  const description = t("description");
  return { title, description, ...makePageMeta(title, description) };
}

// Always fetch fresh data from DB on each request
export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const [t, locale] = await Promise.all([
    getTranslations("News"),
    getLocale(),
  ]);
  const userLang = locale === "vi" ? "vi" : "en";

  // Fetch from DB — preferred language first, then global
  const allArticles = await getNewsFromDB(300, userLang);
  // Always split by Vietnamese vs International (not relative to user locale)
  const localArticles = allArticles.filter((a) => a.language === "vi");
  const globalArticles = allArticles.filter((a) => a.language !== "vi");

  const sources = [
    "LiverpoolFC.com", "BBC Sport", "The Guardian", "This Is Anfield",
    "Liverpool Echo", "Sky Sports", "Anfield Watch",
    "Bóng Đá", "Bóng Đá+", "24h", "VnExpress", "Tuổi Trẻ", "Thanh Niên",
    "Dân Trí", "Zing News", "VietNamNet", "Webthethao",
  ].join(", ");

  return (
    <div className="min-h-screen">
      {/* Hero Banner — compact, with pt for navbar clearance */}
      <div className="relative min-h-[200px] flex items-end pt-16">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('/assets/lfc/fans/fans-anfield-crowd.webp')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stadium-bg via-stadium-bg/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-stadium-bg/80 to-transparent" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 pt-10 w-full">
          <h1 className="font-bebas text-5xl md:text-6xl text-white tracking-wider leading-none mb-2">
            {t("title")}
          </h1>
          <p className="font-inter text-stadium-muted text-sm max-w-2xl">
            {t("heroDesc")}
          </p>
        </div>
      </div>

      {/* News Feed */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <NewsFeed
          localArticles={localArticles}
          globalArticles={globalArticles}
          locale={userLang}
        />

        {/* Attribution */}
        <p className="text-center text-stadium-muted font-inter text-xs mt-10">
          {t("attribution", { sources })}
        </p>
      </div>
    </div>
  );
}
