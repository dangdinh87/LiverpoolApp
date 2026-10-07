import { describe, expect, it } from "vitest";
import squad from "@/data/squad.json";
import en from "@/messages/en.json";
import vi from "@/messages/vi.json";
import { NATIONALITY_KEYS, getNationality } from "@/lib/nationality";

describe("getNationality", () => {
  it("maps squad adjectives to a flag and a message key", () => {
    expect(getNationality("Georgian")).toEqual({ flag: "🇬🇪", key: "georgian" });
    expect(getNationality("Northern Irish").key).toBe("northernIrish");
  });

  it("treats the data spelling 'Wales' like 'Welsh'", () => {
    expect(getNationality("Wales").key).toBe("welsh");
  });

  it("falls back to a neutral flag and no key for unknown values", () => {
    expect(getNationality("Martian")).toEqual({ flag: "🏳️", key: null });
  });

  it("covers every nationality in squad.json", () => {
    const unknown = [...new Set(squad.players.map((p) => p.nationality))].filter((n) => getNationality(n).key === null);
    expect(unknown).toEqual([]);
  });

  it("has a translation for every key in both locales", () => {
    for (const messages of [en, vi]) {
      const labels = messages.PlayerDetail.nationalities as Record<string, string>;
      expect(NATIONALITY_KEYS.filter((k) => !labels[k])).toEqual([]);
    }
  });
});
