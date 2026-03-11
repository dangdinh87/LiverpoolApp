// Client-safe news config — no "server-only" guard
// Types re-exported from the news module types
export type { NewsSource, NewsLanguage, ArticleCategory } from "./news/types";
import type { NewsSource, ArticleCategory } from "./news/types";

export const SOURCE_CONFIG: Record<
  NewsSource,
  { label: string; color: string }
> = {
  lfc: { label: "Liverpool FC", color: "bg-lfc-red text-white" },
  bbc: { label: "BBC Sport", color: "bg-[#BB1919] text-white" },
  guardian: { label: "The Guardian", color: "bg-[#052962] text-[#9DBFFF]" },
  tia: { label: "This Is Anfield", color: "bg-amber-700 text-amber-100" },
  echo: { label: "Liverpool Echo", color: "bg-purple-700 text-purple-100" },
  sky: { label: "Sky Sports", color: "bg-red-700 text-red-100" },
  "anfield-watch": { label: "Anfield Watch", color: "bg-rose-700 text-rose-100" },
  bongda: { label: "Bóng Đá", color: "bg-emerald-700 text-emerald-100" },
  "24h": { label: "24h", color: "bg-orange-700 text-orange-100" },
  bongdaplus: { label: "Bóng Đá+", color: "bg-sky-700 text-sky-100" },
  vnexpress: { label: "VnExpress", color: "bg-blue-800 text-blue-100" },
  tuoitre: { label: "Tuổi Trẻ", color: "bg-teal-700 text-teal-100" },
  thanhnien: { label: "Thanh Niên", color: "bg-amber-800 text-amber-100" },
  dantri: { label: "Dân Trí", color: "bg-cyan-700 text-cyan-100" },
  zingnews: { label: "ZNews", color: "bg-violet-700 text-violet-100" },
  vietnamnet: { label: "VietNamNet", color: "bg-lime-700 text-lime-100" },
  bongdaso: { label: "Bóng Đá Số", color: "bg-green-800 text-green-100" },
  webthethao: { label: "Webthethao", color: "bg-pink-700 text-pink-100" },
  eotk: { label: "Empire of the Kop", color: "bg-yellow-700 text-yellow-100" },
};

export const CATEGORY_CONFIG: Record<
  ArticleCategory,
  { label: string; color: string }
> = {
  "match-report": { label: "Match Report", color: "bg-green-500/20 text-green-400" },
  transfer: { label: "Transfer", color: "bg-blue-500/20 text-blue-400" },
  injury: { label: "Injury", color: "bg-red-500/20 text-red-400" },
  opinion: { label: "Opinion", color: "bg-violet-500/20 text-violet-400" },
  "team-news": { label: "Team News", color: "bg-cyan-500/20 text-cyan-400" },
  analysis: { label: "Analysis", color: "bg-indigo-500/20 text-indigo-400" },
  general: { label: "General", color: "bg-gray-500/20 text-gray-400" },
};

// Source → hostname mapping for URL reconstruction
const SOURCE_HOSTS: Record<string, string> = {
  lfc: "www.liverpoolfc.com",
  bbc: "www.bbc.com",
  guardian: "www.theguardian.com",
  tia: "www.thisisanfield.com",
  echo: "www.liverpoolecho.co.uk",
  sky: "www.skysports.com",
  "anfield-watch": "www.anfieldwatch.co.uk",
  bongda: "bongda.com.vn",
  "24h": "www.24h.com.vn",
  bongdaplus: "bongdaplus.vn",
  vnexpress: "vnexpress.net",
  tuoitre: "tuoitre.vn",
  thanhnien: "thanhnien.vn",
  dantri: "dantri.com.vn",
  zingnews: "znews.vn",
  vietnamnet: "vietnamnet.vn",
  bongdaso: "bongdaso.com",
  webthethao: "webthethao.vn",
  eotk: "www.empireofthekop.com",
};

// Hostname → source prefix (reverse lookup, with and without www)
const HOST_TO_SOURCE: Record<string, string> = {};
for (const [src, host] of Object.entries(SOURCE_HOSTS)) {
  HOST_TO_SOURCE[host] = src;
  // Support both www and non-www variants for encoding
  if (host.startsWith("www.")) {
    HOST_TO_SOURCE[host.replace(/^www\./, "")] = src;
  } else {
    HOST_TO_SOURCE[`www.${host}`] = src;
  }
}

// Encode article URL → readable slug: {source}/{url-path-segments}
export function encodeArticleSlug(url: string): string {
  try {
    const u = new URL(url);
    const source = HOST_TO_SOURCE[u.hostname] ?? "ext";
    // Strip leading slash from pathname, keep rest as-is
    const path = (u.pathname + u.search).replace(/^\//, "");
    return `${source}/${path}`;
  } catch {
    // Fallback to base64url for malformed URLs
    if (typeof window !== "undefined") {
      return btoa(url).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }
    return Buffer.from(url).toString("base64url");
  }
}

// Decode slug segments back to original URL
export function decodeArticleSlug(segments: string[]): string | null {
  if (segments.length === 0) return null;

  const [source, ...pathParts] = segments;

  // New format: {source}/{path...}
  const host = SOURCE_HOSTS[source];
  if (host && pathParts.length > 0) {
    return `https://${host}/${pathParts.join("/")}`;
  }

  // Legacy base64url format (single segment, no known source prefix)
  try {
    const combined = segments.join("/");
    const base64 = combined.replace(/-/g, "+").replace(/_/g, "/");
    if (typeof window !== "undefined") {
      return atob(base64);
    }
    const decoded = Buffer.from(base64, "base64").toString("utf-8");
    if (decoded.startsWith("http")) return decoded;
  } catch { /* not base64 */ }

  return null;
}

// Build in-app article URL
export function getArticleUrl(articleLink: string): string {
  return `/news/${encodeArticleSlug(articleLink)}`;
}

export function formatRelativeDate(dateStr: string, lang?: "en" | "vi"): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";

  const now = Date.now();
  const diff = now - date.getTime();

  // Future or negative → treat as recent
  if (diff < 0) return lang === "vi" ? "Vừa xong" : "Just now";

  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return lang === "vi" ? "Vừa xong" : "Just now";
  if (mins < 60) return lang === "vi" ? `${mins} phút trước` : `${mins}m ago`;

  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return lang === "vi" ? `${hours} giờ trước` : `${hours}h ago`;

  const days = Math.floor(diff / 86_400_000);
  if (days < 7) return lang === "vi" ? `${days} ngày trước` : `${days}d ago`;

  return date.toLocaleDateString(lang === "vi" ? "vi-VN" : "en-GB", {
    day: "numeric",
    month: "short",
  });
}
