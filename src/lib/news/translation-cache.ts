// Client-side translation cache — localStorage
// Stores full translated paragraphs to avoid re-calling API

interface CachedTranslation {
  title_vi: string;
  description_vi?: string;
  paragraphs: string[];
  cachedAt: number;
}

const CACHE_PREFIX = "lfc-translate-";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getCacheKey(url: string): string {
  // Simple hash from URL
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0;
  }
  return `${CACHE_PREFIX}${Math.abs(hash).toString(36)}`;
}

export function getCachedTranslation(url: string): CachedTranslation | null {
  if (typeof window === "undefined") return null;
  try {
    const key = getCacheKey(url);
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const cached: CachedTranslation = JSON.parse(raw);

    // Check expiry
    if (Date.now() - cached.cachedAt > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }

    return cached;
  } catch {
    return null;
  }
}

export function setCachedTranslation(
  url: string,
  title_vi: string,
  paragraphs: string[],
  description_vi?: string
): void {
  if (typeof window === "undefined") return;
  try {
    const key = getCacheKey(url);
    const cached: CachedTranslation = {
      title_vi,
      description_vi,
      paragraphs,
      cachedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cached));
  } catch {
    // localStorage full or disabled — ignore
  }
}
