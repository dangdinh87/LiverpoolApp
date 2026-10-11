import { describe, expect, it } from "vitest";
import { similarity, tooSimilar, wordTrigrams } from "@/lib/site-articles/similarity";

const REPORT_A =
  "Liverpool took the lead through Mohamed Salah in the first half. " +
  "The visitors levelled before the break. A late goal settled it at Anfield.";
// Same sentences, different match: this is the failure mode being guarded.
const TEMPLATED_B =
  "Liverpool took the lead through Cody Gakpo in the first half. " +
  "The visitors levelled before the break. A late goal settled it at Anfield.";
const DIFFERENT_C =
  "Three points slipped away on the road. Liverpool controlled possession " +
  "without turning it into chances, and a defensive error decided the afternoon.";

describe("similarity", () => {
  it("scores a text against itself as identical", () => {
    expect(similarity(REPORT_A, REPORT_A)).toBe(1);
  });

  it("sees through swapped names and numbers to the same template", () => {
    expect(similarity(REPORT_A, TEMPLATED_B)).toBeGreaterThan(0.5);
  });

  it("scores genuinely different writing low", () => {
    expect(similarity(REPORT_A, DIFFERENT_C)).toBeLessThan(0.1);
  });

  it("ignores numbers, which are what legitimately differ between reports", () => {
    const withNumbers = "Liverpool won 2-1 after 90 minutes of football here";
    const otherNumbers = "Liverpool won 4-0 after 95 minutes of football here";
    expect(similarity(withNumbers, otherNumbers)).toBe(1);
  });

  it("returns nothing for a text too short to form a trigram", () => {
    expect(wordTrigrams("too short").size).toBe(0);
    expect(similarity("too short", REPORT_A)).toBe(0);
  });
});

describe("tooSimilar", () => {
  it("names the previous article a draft repeats", () => {
    const hit = tooSimilar(TEMPLATED_B, [DIFFERENT_C, REPORT_A]);
    expect(hit?.index).toBe(1);
    expect(hit?.score).toBeGreaterThan(0.5);
  });

  it("passes a draft that repeats nothing", () => {
    expect(tooSimilar(DIFFERENT_C, [REPORT_A])).toBeNull();
  });

  it("passes when there is nothing to compare against", () => {
    expect(tooSimilar(REPORT_A, [])).toBeNull();
  });
});
