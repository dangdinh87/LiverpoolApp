/** Lowercase words that belong to the surname they stand in front of ("van Dijk", "Mac Allister"). */
const SURNAME_PARTICLES = new Set([
  "van", "von", "der", "den", "de", "da", "do", "dos", "das", "di", "del", "della",
  "la", "le", "ten", "ter", "el", "al", "mac", "mc", "st",
]);

/**
 * The name a supporter says: the last word plus any particle before it.
 * `name.split(" ").slice(-1)` turned "Virgil van Dijk" into "Dijk".
 */
export function playerSurname(name: string): string {
  const words = name.trim().split(/\s+/);
  let start = words.length - 1;
  while (start > 0 && SURNAME_PARTICLES.has(words[start - 1].toLowerCase())) start--;
  return words.slice(start).join(" ");
}
