import { describe, expect, it } from "vitest";
import { hasForeignScript, stripForeignScript } from "../strip-foreign-script";

describe("stripForeignScript / hasForeignScript", () => {
  it("preserves Vietnamese diacritics, English text, punctuation, newlines, and emojis", () => {
    const clean = "Liverpool thắng 2-1 tại Anfield!\nSalah ghi bàn tuyệt đẹp ⚽🔥";
    expect(hasForeignScript(clean)).toBe(false);
    expect(stripForeignScript(clean)).toBe(clean);
  });

  it("detects and strips CJK, Thai, Arabic, and Cyrillic scripts while collapsing double spaces", () => {
    expect(hasForeignScript("Liverpool có thểหยุด đối thủ")).toBe(true);
    expect(stripForeignScript("Liverpool có thểหยุด đối thủ")).toBe("Liverpool có thể đối thủ");

    expect(hasForeignScript("Trận đấu 它以前 rất căng")).toBe(true);
    expect(stripForeignScript("Trận đấu 它以前 rất căng")).toBe("Trận đấu rất căng");

    expect(hasForeignScript("Chiến thắng الوطن vàПривет")).toBe(true);
    expect(stripForeignScript("Chiến thắng الوطن vàПривет")).toBe("Chiến thắng và");
  });
});
