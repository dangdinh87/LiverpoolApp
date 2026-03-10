import type { Metadata } from "next";

/** Standard OG + Twitter card metadata for a page */
export function makePageMeta(title: string, description: string): Partial<Metadata> {
  return {
    openGraph: { title, description, type: "website", siteName: "Liverpool FC Fan Site" },
    twitter: { card: "summary_large_image", title, description },
  };
}
