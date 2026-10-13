/**
 * Headlines are set in Newsreader, the brand's headline face, whether they are
 * the publisher's words or ours; League Gothic is kept for the wordmark and scores.
 */
export const ARTICLE_TITLE_CLASS =
  "max-w-3xl text-balance font-serif text-[26px] font-semibold leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-[42px]";
export const ARTICLE_LEAD_CLASS = "mt-5 max-w-[42rem] text-[17px] leading-[1.65] text-white/85 sm:text-lg";

/** Headline. Server-rendered. */
export function ArticleTitle({ title }: { title: string }) {
  return <h1 className={ARTICLE_TITLE_CLASS}>{title}</h1>;
}
