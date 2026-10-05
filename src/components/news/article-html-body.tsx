"use client";

import { useEffect, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";
import { useTranslations } from "next-intl";
import { ArticleVideoPlayer } from "./article-video-player";
import { isHttpUrl, prepareArticleHtml } from "./news-text";

function httpsOnly(value: string | undefined): string | undefined {
  return value && /^https:\/\//i.test(value) ? value : undefined;
}

/**
 * Renders extracted article HTML.
 *
 * The (already sanitised) markup is server-rendered so the text is in the first
 * paint and for crawlers; `prepareArticleHtml` adds a last defensive pass
 * (http(s)-only links, lazy no-referrer images, junk paragraphs removed).
 * Video placeholders the extractor emits as
 *   <div class="article-video-player" data-video-src="..." data-poster="...">
 * are upgraded after hydration by mounting a small React root into each one,
 * which keeps React away from the injected markup.
 */
export function ArticleHtmlBody({ html }: { html: string }) {
  const t = useTranslations("News.article");
  const videoLabel = t("videoUnavailable");
  const prepared = useMemo(() => prepareArticleHtml(html), [html]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const placeholders = container.querySelectorAll<HTMLElement>(".article-video-player[data-video-src]");
    if (placeholders.length === 0) return;

    // Each run mounts into a fresh child host, so a strict-mode double run (or a
    // deferred unmount) never meets a container that already has a root.
    const mounted: { root: ReturnType<typeof createRoot>; host: HTMLElement }[] = [];
    placeholders.forEach((el) => {
      // data-* values come from scraped third-party HTML: only https reaches the player.
      const src = httpsOnly(el.dataset.videoSrc);
      if (!src) return;
      const host = document.createElement("div");
      host.className = "article-video-host";
      el.appendChild(host);
      const root = createRoot(host);
      const sourceUrl = el.dataset.sourceUrl;
      root.render(
        <ArticleVideoPlayer
          src={src}
          poster={httpsOnly(el.dataset.poster)}
          sourceUrl={isHttpUrl(sourceUrl) ? sourceUrl : undefined}
          sourceName={el.dataset.sourceName}
          fallbackLabel={videoLabel}
        />,
      );
      mounted.push({ root, host });
    });

    return () => {
      // Unmounting inside a commit is flagged by React; defer it.
      setTimeout(() => {
        mounted.forEach(({ root, host }) => {
          root.unmount();
          host.remove();
        });
      }, 0);
    };
  }, [prepared, videoLabel]);

  return <div ref={containerRef} className="article-prose" dangerouslySetInnerHTML={{ __html: prepared }} />;
}
