import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteArticleBadge } from "@/components/news/site-article-badge";
import { cleanTitle, keepDatesTogether, leadSentences } from "@/components/news/news-text";
import { getSeoArticleFromDigest, getVisibleDigestSections, type DigestRecord } from "@/lib/news/digest";
import { CATEGORY_CONFIG } from "@/lib/news-config";
import { formatMatchDayMonth } from "@/lib/format-match-date";
import { BRAND } from "@/lib/brand";

const STORIES_SHOWN = 3;

/**
 * Today's briefing as the homepage's lead: its headline and intro, then its top
 * stories numbered, each a link straight to that story in the digest. It is
 * the one thing on the page the site writes itself, so it gets the room.
 */
export async function DigestFeature({ digest, locale }: { digest: DigestRecord; locale: "vi" | "en" }) {
  const t = await getTranslations("Home.digest");
  const tDigest = await getTranslations("News.digest");
  // Category labels are interface text and exist in both locales; they used to
  // come from the model, which only ever produced one language.
  const tCat = await getTranslations("News.categories");
  const seo = getSeoArticleFromDigest(digest);
  const title = cleanTitle(seo?.title || digest.title);
  const intro = leadSentences(seo?.excerpt || digest.summary, 200);
  const stories = getVisibleDigestSections(digest.sections).slice(0, STORIES_SHOWN);
  const href = `/news/digest/${digest.digest_date}`;
  const dateText = formatMatchDayMonth(new Date(`${digest.digest_date}T00:00:00+07:00`), locale, true);

  return (
    <section aria-labelledby="home-digest" className="surface reveal relative overflow-hidden border-l-4 border-l-lfc-red">
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-10">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <SiteArticleBadge label={tDigest("proBadge", { brand: BRAND.name })} compact />
            <span className="text-[13px] text-stadium-muted">{dateText}</span>
          </div>
          <p className="mt-4 text-sm font-semibold text-lfc-gold">{t("kicker")}</p>
          <h2 id="home-digest" className="mt-1 text-balance font-bebas text-[34px] leading-[1.02] text-white sm:text-5xl">
            <Link href={href} className="hover:text-white/90">
              {keepDatesTogether(title)}
            </Link>
          </h2>
          {intro && <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/80 sm:text-base">{intro}</p>}
          <Link
            href={href}
            className="mt-5 inline-flex min-h-11 items-center gap-2 bg-lfc-red px-5 font-barlow text-sm font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-lfc-red-dark active:scale-[0.98]"
          >
            {tDigest("readFull")}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        {stories.length > 0 && (
          <div className="min-w-0 lg:border-l lg:border-[var(--line)] lg:pl-10">
            <p className="text-sm font-semibold text-white">{t("inside", { count: getVisibleDigestSections(digest.sections).length })}</p>
            <ol className="mt-3 divide-y divide-[var(--line)]">
              {stories.map((story, i) => {
                const cat = CATEGORY_CONFIG[story.category as keyof typeof CATEGORY_CONFIG];
                return (
                  <li key={i}>
                    <Link href={`${href}#tin-${i + 1}`} className="group flex gap-4 py-3.5">
                      <span className="w-5 shrink-0 font-bebas text-3xl leading-none text-lfc-gold tabular-nums">{i + 1}</span>
                      <span className="min-w-0">
                        {cat && (
                          <span className={`mb-1.5 inline-block px-1.5 py-0.5 font-barlow text-[11px] font-bold uppercase tracking-wider ${cat.color}`}>
                            {tCat(story.category)}
                          </span>
                        )}
                        <span className="block text-[15px] font-semibold leading-snug text-white decoration-lfc-red decoration-2 underline-offset-4 group-hover:underline">
                          {story.headline}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}
