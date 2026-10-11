/**
 * How alike two articles read.
 *
 * Match reports share a vocabulary by nature — the same competition, the same
 * squad, the same handful of verbs — so a generator left unchecked drifts into
 * writing one article over and over with the numbers swapped. That is the exact
 * shape Google's spam policy calls scaled content abuse: many pages, no added
 * value. Rejecting a near-repeat is cheaper than publishing it.
 *
 * Trigrams over words, not characters: character trigrams score any two English
 * texts as similar, while word trigrams measure whether the sentences are
 * actually built the same way.
 */

/** Overlapping three-word sequences, normalised and stripped of numbers. */
export function wordTrigrams(text: string): Set<string> {
  const words = text
    .toLowerCase()
    // Numbers are what legitimately differs between two match reports, so
    // comparing with them in would hide the repetition we are looking for.
    .replace(/\d+/g, " ")
    .split(/[^\p{L}']+/u)
    .filter((w) => w.length > 1);

  const grams = new Set<string>();
  for (let i = 0; i + 2 < words.length; i++) {
    grams.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }
  return grams;
}

/** Jaccard overlap of two texts' word trigrams, 0 (unalike) to 1 (identical). */
export function similarity(a: string, b: string): number {
  const ga = wordTrigrams(a);
  const gb = wordTrigrams(b);
  if (ga.size === 0 || gb.size === 0) return 0;
  let shared = 0;
  for (const gram of ga) if (gb.has(gram)) shared++;
  return shared / (ga.size + gb.size - shared);
}

/**
 * Above this, two articles of the same kind are the same article.
 *
 * Starting point, not a measured value: tune it once there are real drafts to
 * compare (see the spec's open questions).
 */
export const SIMILARITY_LIMIT = 0.4;

/** The closest previous article, when it is too close to publish alongside. */
export function tooSimilar(
  candidate: string,
  previous: string[],
  limit: number = SIMILARITY_LIMIT,
): { score: number; index: number } | null {
  let worst = { score: 0, index: -1 };
  previous.forEach((text, index) => {
    const score = similarity(candidate, text);
    if (score > worst.score) worst = { score, index };
  });
  return worst.score >= limit ? worst : null;
}
