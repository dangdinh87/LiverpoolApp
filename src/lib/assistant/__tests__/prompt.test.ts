import { describe, expect, it } from "vitest";
import { buildAssistantSystemPrompt } from "../prompt";

describe("buildAssistantSystemPrompt", () => {
  it("instructs Vietnamese cheerful Kopite supporter tone and strict tool grounding", () => {
    const prompt = buildAssistantSystemPrompt({ locale: "vi", path: "/vi" });

    expect(prompt).toContain("cheerful, warm, upbeat, and friendly");
    expect(prompt).toContain("fellow Kopite");
    expect(prompt).toContain("nhé");
    expect(prompt).toContain("ALWAYS call the appropriate tool first");
  });

  it("instructs British English cheerful tone for en locale", () => {
    const prompt = buildAssistantSystemPrompt({ locale: "en", path: "/" });

    expect(prompt).toContain("British English");
    expect(prompt).toContain("upbeat British supporter tone");
    expect(prompt).toContain("Current reader path: /");
  });

  it("includes spoiler-free protection when spoilerFree is enabled", () => {
    const prompt = buildAssistantSystemPrompt({
      locale: "vi",
      path: "/vi/fixtures",
      spoilerFree: true,
    });

    expect(prompt).toContain("SPOILER-FREE MODE IS ACTIVE");
  });
});
