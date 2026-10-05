import type { NewsSource } from "./types";
import { findSourceByHost, VI_SOURCE_IDS } from "./source-hosts";

export type DetectedSourceId = NewsSource | "unknown";

/**
 * Unified source detection: URL → { id, name }. Host-based (not substring) and
 * backed by the shared host table; unknown hosts yield id "unknown".
 */
export function detectSource(url: string): { id: DetectedSourceId; name: string } {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    return { id: "unknown", name: "" };
  }
  const entry = findSourceByHost(host);
  if (entry) return { id: entry.id, name: entry.name };
  return { id: "unknown", name: host };
}

/** Vietnamese source IDs (string-keyed so DetectedSourceId can be tested directly). */
export const VI_SOURCES: ReadonlySet<string> = VI_SOURCE_IDS;

/**
 * Sources behind a bot challenge (Cloudflare "Just a moment…" / 403 for every
 * client): never scraped, the reader shows headline + summary and links out.
 * Anfield Index joined This Is Anfield here in Oct 2026.
 */
const LINK_OUT_ONLY: ReadonlySet<string> = new Set(["tia", "anfieldindex"]);

export function isLinkOutOnlyUrl(url: string): boolean {
  return LINK_OUT_ONLY.has(detectSource(url).id);
}
