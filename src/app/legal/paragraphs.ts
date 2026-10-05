/**
 * Split a long policy string into short paragraphs (a few sentences each) so
 * legal copy stays readable. Splits on sentence ends followed by a capital
 * letter or digit; keeps abbreviations like "Football-Data.org." intact.
 */
export function toParagraphs(text: string, sentencesPerParagraph = 2): string[] {
  const sentences = text.split(/(?<=[.!?])\s+(?=[\p{Lu}\d])/u).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < sentences.length; i += sentencesPerParagraph) {
    out.push(sentences.slice(i, i + sentencesPerParagraph).join(" "));
  }
  return out;
}
