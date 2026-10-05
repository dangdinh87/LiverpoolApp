import { interleave, isHttpUrl } from "./news-text";

/** Plain-text article body: paragraphs with photos spread through them. */
export function ArticleFigures({ paragraphs, images }: { paragraphs: string[]; images: string[] }) {
  const safeImages = images.filter(isHttpUrl);
  return (
    <div className="article-prose">
      {interleave(paragraphs, safeImages).map((item, i) =>
        item.kind === "p" ? (
          <p key={`p-${i}`}>{item.value}</p>
        ) : (
          <figure key={`i-${i}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.value} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
          </figure>
        ),
      )}
    </div>
  );
}
