import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { NewsThumb } from "@/components/news/news-thumb";
import { SiteArticleBadge } from "@/components/news/site-article-badge";
import { outletName, pickStoryImages } from "@/components/news/digest-images";
import { cleanTitle, keepDatesTogether } from "@/components/news/news-text";
import { getVisibleDigestSections, type DigestRecord } from "@/lib/news/digest";
import { getDigestHeadline } from "@/lib/news/latest-digest";
import { getArticleRefsByUrls } from "@/lib/news";
import { formatMatchDayMonth } from "@/lib/format-match-date";
import { BRAND } from "@/lib/brand";

/** The lead story plus this many more beside it. */
const MORE_SHOWN = 4;

/**
 * Today's briefing as the homepage's lead, laid out like a magazine front: the
 * briefing headline over the lead story's photo, then the next stories as rows
 * with their own pictures, each a link straight to that story in the digest.
 *
 * It used to be text only (a headline, an intro, numbered titles in a box),
 * which read as a list rather than a front page. The pictures come from the
 * stories' source articles, one per story and never the same photo twice.
 */
export async function DigestFeature({ digest, locale }: { digest: DigestRecord; locale: "vi" | "en" }) {
  const t = await getTranslations("Home.digest");
  const tDigest = await getTranslations("News.digest");
  const title = cleanTitle(getDigestHeadline(digest));
  const allStories = getVisibleDigestSections(digest.sections);
  const shown = allStories.slice(0, MORE_SHOWN + 1);
  // Failures resolve to {} inside the lookup, so the block still renders, just without pictures.
  const refs = await getArticleRefsByUrls(shown.flatMap((s) => s.articleUrls));
  const images = pickStoryImages(shown, refs);
  const href = `/news/digest/${digest.digest_date}`;
  const dateText = formatMatchDayMonth(new Date(`${digest.digest_date}T00:00:00+07:00`), locale, true);
  const lead = images[0];

  return (
    <section aria-labelledby="home-digest" className="reveal grid gap-4 lg:grid-cols-12 lg:gap-6">
      {/* Lead: the briefing headline over the first story's photo. */}
      <Link
        href={href}
        className="group relative isolate flex min-h-[300px] flex-col justify-end overflow-hidden bg-[var(--surface-3)] p-5 sm:min-h-[360px] sm:p-6 lg:col-span-7"
      >
        <span className="absolute inset-0 -z-20 transition-transform duration-500 group-hover:scale-[1.03]">
          <NewsThumb src={lead?.src} source={lead?.source ?? "bbc"} sizes="(max-width: 1024px) 100vw, 700px" priority />
        </span>
        <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/75 to-black/10" />
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <SiteArticleBadge label={tDigest("proBadge", { brand: BRAND.name })} compact />
          <span className="text-[13px] text-white/75">{dateText}</span>
        </span>
        <span className="mt-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-lfc-gold">{t("kicker")}</span>
        <h2
          id="home-digest"
          className="mt-1.5 line-clamp-3 text-balance font-serif text-[26px] font-semibold leading-[1.12] tracking-tight text-white [text-shadow:0_2px_16px_rgba(0,0,0,0.5)] sm:text-[32px]"
        >
          {keepDatesTogether(title)}
        </h2>
        <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/80">
          <span>{t("inside", { count: allStories.length })}</span>
          <span className="inline-flex items-center gap-1.5 font-barlow font-semibold uppercase tracking-[0.1em] text-white group-hover:text-lfc-gold">
            {tDigest("readFull")}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
          {lead && <span className="text-xs text-white/55">{lead.credit}</span>}
        </span>
      </Link>

      {/* The next stories, each with its own picture. */}
      {shown.length > 1 && (
        <ol className="flex flex-col divide-y divide-[var(--line)] lg:col-span-5">
          {shown.slice(1).map((story, j) => {
            const i = j + 1;
            const image = images[i];
            return (
              <li key={i} className="first:[&>a]:pt-0">
                <Link href={`${href}#tin-${i + 1}`} className="group flex items-start gap-3.5 py-3 lg:py-3.5">
                  <span className="relative aspect-[4/3] w-24 shrink-0 overflow-hidden bg-[var(--surface-3)] sm:w-28">
                    <NewsThumb src={image?.src} source={image?.source ?? "bbc"} sizes="112px" />
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-3 font-serif text-[16px] font-semibold leading-[1.28] tracking-[-0.01em] text-white decoration-lfc-red decoration-2 underline-offset-4 group-hover:underline sm:text-[17px]">
                      {story.headline}
                    </span>
                    {story.articleUrls[0] && (
                      <span className="mt-1 block text-xs text-stadium-muted">{image?.credit ?? outletName(story.articleUrls[0])}</span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
