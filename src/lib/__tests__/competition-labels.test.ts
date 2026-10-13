import { describe, expect, it } from "vitest";
import { competitionKey, competitionLabel, competitionName } from "../competition-labels";

describe("competition labels", () => {
  it("folds every provider spelling of a competition into one key", () => {
    expect(competitionKey("EFL Cup")).toBe("efl");
    expect(competitionKey("Carabao Cup")).toBe("efl");
    expect(competitionKey("League Cup")).toBe("efl");
    expect(competitionKey("UEFA Champions League")).toBe("ucl");
    expect(competitionKey("Champions League")).toBe("ucl");
    expect(competitionKey("Not A Competition")).toBeNull();
  });

  it("uses one long and one short name per locale", () => {
    expect(competitionName("ucl", "vi")).toBe("Champions League");
    expect(competitionName("ucl", "vi", "short")).toBe("UCL");
    expect(competitionName("pl", "vi")).toBe("Ngoại hạng Anh");
    expect(competitionName("pl", "en")).toBe("Premier League");
    expect(competitionLabel("Carabao Cup", "en")).toBe("EFL Cup");
  });

  it("keeps the provider's own name for a competition it does not know", () => {
    expect(competitionLabel("Super Cup", "en")).toBe("Super Cup");
  });
});
