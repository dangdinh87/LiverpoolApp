export const ARTICLE_TITLE_CLASS =
  "font-bebas text-[40px] sm:text-5xl lg:text-6xl font-normal leading-[1.02] tracking-wide text-white text-balance max-w-4xl";
export const ARTICLE_LEAD_CLASS =
  "mt-4 max-w-3xl border-l-4 border-lfc-red pl-4 text-lg sm:text-xl leading-relaxed text-stadium-muted";

/** Headline + standfirst. Server-rendered; the translatable variant lives in translate-button. */
export function ArticleTitle({ title, description }: { title: string; description?: string }) {
  return (
    <>
      <h1 className={ARTICLE_TITLE_CLASS}>{title}</h1>
      {description && <p className={ARTICLE_LEAD_CLASS}>{description}</p>}
    </>
  );
}
