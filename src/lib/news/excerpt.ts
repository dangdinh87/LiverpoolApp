/**
 * Full-text reproduction of someone else's copyrighted article is the main
 * legal exposure of the news feature — these pages render BBC/Guardian/Sky
 * Sports/Reach plc (and Vietnamese outlets') text on an ad-monetized page.
 * This caps what we ever render or translate to a short excerpt, the same
 * shape a Google News preview or RSS reader uses, and always points the
 * reader to the original for the rest.
 */
const EXCERPT_MAX_CHARS = 480;

export function buildExcerpt(paragraphs: string[]): { excerpt: string[]; truncated: boolean } {
  const clean = paragraphs.filter((p) => p.trim().length > 0);
  if (clean.length === 0) return { excerpt: [], truncated: false };

  const excerpt: string[] = [];
  let used = 0;
  for (const p of clean) {
    if (excerpt.length > 0 && used + p.length > EXCERPT_MAX_CHARS) break;
    excerpt.push(p);
    used += p.length;
    if (used >= EXCERPT_MAX_CHARS) break;
  }

  // The lead paragraph alone can already exceed the cap — cut it at a word boundary.
  if (excerpt.length === 1 && excerpt[0].length > EXCERPT_MAX_CHARS) {
    const cut = excerpt[0].slice(0, EXCERPT_MAX_CHARS);
    const lastSpace = cut.lastIndexOf(" ");
    excerpt[0] = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + "…";
  }

  const truncated = clean.length > excerpt.length || excerpt[excerpt.length - 1]?.endsWith("…") === true;
  return { excerpt, truncated };
}
