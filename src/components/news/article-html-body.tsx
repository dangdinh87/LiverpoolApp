"use client";

import { useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { ArticleVideoPlayer } from "./article-video-player";

/**
 * Renders article htmlContent and hydrates embedded video players.
 * Video placeholders are inserted by the extractor as:
 *   <div class="article-video-player" data-video-src="..." data-poster="..." ...>
 * This component imperatively mounts React video players into those divs
 * to avoid dangerouslySetInnerHTML re-render conflicts with portals.
 */
export function ArticleHtmlBody({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rootsRef = useRef<ReturnType<typeof createRoot>[]>([]);

  const setContainer = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      if (!node) return;
      // Set innerHTML once — React won't touch it after this
      node.innerHTML = html;
    },
    [html]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Find all video player placeholders
    const players = container.querySelectorAll<HTMLElement>(
      ".article-video-player[data-video-src]"
    );
    if (players.length === 0) return;

    // Mount React video players into each placeholder
    const roots: ReturnType<typeof createRoot>[] = [];
    players.forEach((el) => {
      const root = createRoot(el);
      root.render(
        <ArticleVideoPlayer
          src={el.dataset.videoSrc!}
          poster={el.dataset.poster}
          sourceUrl={el.dataset.sourceUrl}
          sourceName={el.dataset.sourceName}
        />
      );
      roots.push(root);
    });
    rootsRef.current = roots;

    return () => {
      // Defer unmount to avoid "synchronously unmount during render" error
      setTimeout(() => roots.forEach((r) => r.unmount()), 0);
    };
  }, [html]);

  return (
    <div
      ref={setContainer}
      id="article-body"
      className="article-html-content space-y-6"
    />
  );
}
