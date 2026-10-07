/**
 * Scraped headlines are the publisher's words, so they stay in Inter; League
 * Gothic is reserved for our own pieces (the digest).
 */
export const ARTICLE_TITLE_CLASS =
  "max-w-3xl text-balance font-inter text-[24px] font-extrabold leading-[1.2] tracking-tight text-white sm:text-4xl lg:text-[40px]";
export const ARTICLE_LEAD_CLASS = "mt-5 max-w-[42rem] text-[17px] leading-[1.65] text-white/85 sm:text-lg";

/** Headline. Server-rendered. */
export function ArticleTitle({ title }: { title: string }) {
  return <h1 className={ARTICLE_TITLE_CLASS}>{title}</h1>;
}
