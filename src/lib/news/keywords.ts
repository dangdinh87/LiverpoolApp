// Unicode-aware keyword matching for feed filters. Substring matching let
// "leoni" hit an image hash and "endo" hit "tremendous"; terms must be whole words.

const cache = new Map<string, RegExp>();

function escapeRegex(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matcherFor(keywords: readonly string[]): RegExp {
  const key = keywords.join("\u0000");
  let re = cache.get(key);
  if (!re) {
    const body = [...keywords]
      .map((k) => k.normalize("NFC").toLowerCase())
      .sort((a, b) => b.length - a.length)
      .map(escapeRegex)
      .join("|");
    re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${body})(?![\\p{L}\\p{N}])`, "u");
    cache.set(key, re);
  }
  return re;
}

/** True when any keyword occurs in `text` as a whole word (letters/digits of any script bound it). */
export function matchesAnyKeyword(text: string, keywords: readonly string[]): boolean {
  if (!keywords.length) return false;
  return matcherFor(keywords).test(text.normalize("NFC").toLowerCase());
}
