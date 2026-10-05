// Client-safe news config — no "server-only" guard
// Types re-exported from the news module types
export type { NewsSource, NewsLanguage, ArticleCategory } from "./news/types";
import type { NewsSource, ArticleCategory } from "./news/types";
// Hosts/aliases live in ONE table (news/source-hosts.ts) shared with source-detect.
import { formatDayMonth } from "./format-match-date";
import { findSourceByHost, getSourceEntry, isHostOfSource } from "./news/source-hosts";

export const SOURCE_CONFIG: Record<
  NewsSource,
  { label: string; color: string }
> = {
  lfc: { label: "Liverpool FC", color: "bg-lfc-red text-white" },
  bbc: { label: "BBC Sport", color: "bg-[#BB1919] text-white" },
  guardian: { label: "The Guardian", color: "bg-[#052962] text-[#9DBFFF]" },
  echo: { label: "Liverpool Echo", color: "bg-purple-700 text-purple-100" },
  "anfield-watch": { label: "Anfield Watch", color: "bg-rose-700 text-rose-100" },
  sky: { label: "Sky Sports", color: "bg-sky-800 text-sky-100" },
  mirror: { label: "Daily Mirror", color: "bg-red-700 text-red-100" },
  independent: { label: "The Independent", color: "bg-zinc-700 text-zinc-100" },
  men: { label: "MEN", color: "bg-blue-700 text-blue-100" },
  anfieldindex: { label: "Anfield Index", color: "bg-amber-700 text-amber-100" },
  liverpoolcom: { label: "Liverpool.com", color: "bg-indigo-700 text-indigo-100" },
  tia: { label: "This Is Anfield", color: "bg-pink-700 text-pink-100" },
  espn: { label: "ESPN", color: "bg-rose-800 text-rose-100" },
  bongda: { label: "Bóng Đá", color: "bg-emerald-700 text-emerald-100" },
  "24h": { label: "24h", color: "bg-orange-700 text-orange-100" },
  bongdaplus: { label: "Bóng Đá+", color: "bg-sky-700 text-sky-100" },
  vnexpress: { label: "VnExpress", color: "bg-blue-800 text-blue-100" },
  tuoitre: { label: "Tuổi Trẻ", color: "bg-teal-700 text-teal-100" },
  thanhnien: { label: "Thanh Niên", color: "bg-amber-800 text-amber-100" },
  dantri: { label: "Dân Trí", color: "bg-cyan-700 text-cyan-100" },
  zingnews: { label: "ZNews", color: "bg-violet-700 text-violet-100" },
  vietnamnet: { label: "VietNamNet", color: "bg-lime-700 text-lime-100" },
  webthethao: { label: "Webthethao", color: "bg-pink-700 text-pink-100" },
  eotk: { label: "Empire of the Kop", color: "bg-yellow-700 text-yellow-100" },
  vietnamvn: { label: "Vietnam.vn", color: "bg-red-700 text-red-100" },
  bongda24h: { label: "Bóng Đá 24h", color: "bg-green-700 text-green-100" },
  thethao247: { label: "Thể Thao 247", color: "bg-red-800 text-red-100" },
  soha: { label: "Soha", color: "bg-orange-800 text-orange-100" },
  goal: { label: "GOAL", color: "bg-[#00234B] text-white" },
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

/**
 * True only for http(s) URLs on a configured news source (or a subdomain of one).
 * Anything that fetches an article on a visitor's behalf must check this first:
 * the legacy base64 slug decodes to an arbitrary URL, and without this guard the
 * server would fetch — and render under our domain — any page an attacker names.
 */
export function isKnownNewsSourceUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  if (u.username || u.password || u.port) return false;
  return !!findSourceByHost(u.hostname);
}

/** Marks a path segment that carries the exact host when it is not the source's canonical one. */
const HOST_SEGMENT_PREFIX = "~";

function toBase64Url(value: string): string {
  if (typeof window !== "undefined") {
    return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  return Buffer.from(value).toString("base64url");
}

/**
 * Encode article URL → readable slug.
 *   canonical host:  {source}/{path}                e.g. bbc/sport/football/x
 *   other host:      {source}/~{host}/{path}        e.g. bbc/~www.bbc.co.uk/sport/football/x
 * The slug always decodes back to the exact original URL (host included), and
 * `/news/{source}/{path}` links for canonical hosts stay valid.
 * URLs outside every known source fall back to the opaque base64url form.
 */
export function encodeArticleSlug(url: string): string {
  try {
    const u = new URL(url);
    const entry = findSourceByHost(u.hostname);
    if (!entry) return toBase64Url(url);
    const path = (u.pathname + u.search).replace(/^\//, "");
    const host = u.hostname.toLowerCase();
    if (host === entry.canonical) return `${entry.id}/${path}`;
    return `${entry.id}/${HOST_SEGMENT_PREFIX}${host}/${path}`;
  } catch {
    // Fallback to base64url for malformed URLs
    return toBase64Url(url);
  }
}

// Decode slug segments back to original URL
export function decodeArticleSlug(segments: string[]): string | null {
  if (segments.length === 0) return null;

  const [source, ...pathParts] = segments;

  // New format: {source}/[~{host}/]{path...}
  const entry = getSourceEntry(source);
  if (entry && pathParts.length > 0) {
    let host = entry.canonical;
    let rest = pathParts;
    if (pathParts[0].startsWith(HOST_SEGMENT_PREFIX)) {
      const override = pathParts[0].slice(HOST_SEGMENT_PREFIX.length).toLowerCase();
      if (!isHostOfSource(source, override) || pathParts.length < 2) return null;
      host = override;
      rest = pathParts.slice(1);
    }
    return `https://${host}/${rest.join("/")}`;
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
  if (days < 3) return lang === "vi" ? `${days} ngày trước` : `${days}d ago`;

  // Vietnam-time calendar day (the runtime zone is UTC on Vercel).
  return formatDayMonth(date, lang === "vi" ? "vi" : "en");
}
