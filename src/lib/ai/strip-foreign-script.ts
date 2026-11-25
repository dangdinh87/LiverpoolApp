/**
 * Strip unexpected non-Latin scripts (CJK, Thai, Arabic, Cyrillic, etc.) from
 * model outputs while preserving Vietnamese diacritics, punctuation, newlines,
 * and emojis (`Script=Common` / `Script=Inherited`).
 */

export const FOREIGN_SCRIPT =
  /[^\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]/gu;

const FOREIGN_SCRIPT_TEST =
  /[^\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]/u;

/** Return true if `text` contains any unexpected foreign-script character. */
export function hasForeignScript(text: string): boolean {
  return FOREIGN_SCRIPT_TEST.test(text);
}

/** Remove unexpected foreign-script characters and collapse extra horizontal spaces. */
export function stripForeignScript(text: string): string {
  if (!FOREIGN_SCRIPT_TEST.test(text)) {
    return text;
  }
  return text.replace(FOREIGN_SCRIPT, "").replace(/ {2,}/g, " ");
}
