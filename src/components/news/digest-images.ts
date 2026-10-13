import { detectSource } from "@/lib/news/source-detect";
import { SOURCE_CONFIG } from "@/lib/news-config";
import type { ArticleRef } from "@/lib/news/db";
import type { NewsSource } from "@/lib/news/types";
import type { DigestItemImage } from "./digest-item";
import { isHttpUrl } from "./news-text";

/** Display name of the outlet behind an article URL. */
export function outletName(url: string): string {
  const detected = detectSource(url);
  return (detected.id !== "unknown" && SOURCE_CONFIG[detected.id]?.label) || detected.name;
}

/**
 * One picture per digest story: the first source article that has one and has
 * not been used by an earlier story, so a page never shows the same photo twice.
 * Shared by the digest page and the homepage briefing.
 */
export function pickStoryImages(
  stories: { articleUrls: string[] }[],
  refs: Record<string, ArticleRef>,
): (DigestItemImage | undefined)[] {
  const used = new Set<string>();
  return stories.map((story) => {
    for (const url of story.articleUrls) {
      const src = refs[url]?.image;
      if (!isHttpUrl(src) || used.has(src)) continue;
      used.add(src);
      const detected = detectSource(url);
      return { src, source: (detected.id === "unknown" ? "bbc" : detected.id) as NewsSource, credit: outletName(url) };
    }
    return undefined;
  });
}
