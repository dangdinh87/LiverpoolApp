// Shared news config for client components
// (rss-parser.ts has `import "server-only"` — can't import it from client code)

export type NewsSource = "lfc" | "bbc" | "guardian" | "bongda" | "24h" | "bongdaplus";
export type NewsLanguage = "en" | "vi";

export const SOURCE_CONFIG: Record<
  NewsSource,
  { label: string; color: string }
> = {
  lfc: { label: "LFC", color: "bg-lfc-red/20 text-lfc-red" },
  bbc: { label: "BBC", color: "bg-[#BB1919]/20 text-[#FF6B6B]" },
  guardian: { label: "Guardian", color: "bg-[#052962]/20 text-[#6B9AFF]" },
  bongda: { label: "Bongda", color: "bg-emerald-500/20 text-emerald-400" },
  "24h": { label: "24h", color: "bg-orange-500/20 text-orange-400" },
  bongdaplus: { label: "BD+", color: "bg-sky-500/20 text-sky-400" },
};

// Encode article URL → base64url slug for /news/[slug] route
export function encodeArticleSlug(url: string): string {
  if (typeof window !== "undefined") {
    // Client-side: use btoa
    return btoa(url).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  // Server-side: use Buffer
  return Buffer.from(url).toString("base64url");
}

// Build in-app article URL
export function getArticleUrl(articleLink: string): string {
  return `/news/${encodeArticleSlug(articleLink)}`;
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}
