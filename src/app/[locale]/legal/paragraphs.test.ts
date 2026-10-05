import { describe, expect, it } from "vitest";
import { toParagraphs } from "./paragraphs";

describe("toParagraphs", () => {
  it("groups sentences into paragraphs", () => {
    expect(toParagraphs("One. Two. Three. Four. Five.")).toEqual(["One. Two.", "Three. Four.", "Five."]);
  });

  it("does not split inside domains or mid-sentence punctuation", () => {
    const text = "Data is provided by Football-Data.org and ESPN. News is aggregated from 17+ feeds.";
    expect(toParagraphs(text, 1)).toEqual([
      "Data is provided by Football-Data.org and ESPN.",
      "News is aggregated from 17+ feeds.",
    ]);
  });

  it("handles Vietnamese capitals and empty input", () => {
    expect(toParagraphs("Đây là câu một. Đây là câu hai.", 1)).toEqual(["Đây là câu một.", "Đây là câu hai."]);
    expect(toParagraphs("")).toEqual([]);
  });
});
