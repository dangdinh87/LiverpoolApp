// Client-safe localStorage helpers for tracking read articles
const STORAGE_KEY = "lfc-news-read";
const MAX_ENTRIES = 200;

export function getReadArticles(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function markAsRead(articleUrl: string): void {
  if (typeof window === "undefined") return;
  try {
    const read = getReadArticles();
    read.add(articleUrl);
    // Cap entries to prevent localStorage bloat
    const arr = [...read].slice(-MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // localStorage full or disabled — silent fail
  }
}

// --- Save/bookmark tracking ---
const SAVES_KEY = "lfc-news-saves";

export function getSavedArticles(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(SAVES_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

export function toggleSave(articleUrl: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const saved = getSavedArticles();
    const isNowSaved = !saved.has(articleUrl);
    if (isNowSaved) saved.add(articleUrl); else saved.delete(articleUrl);
    localStorage.setItem(SAVES_KEY, JSON.stringify([...saved].slice(-MAX_ENTRIES)));
    return isNowSaved;
  } catch { return false; }
}
