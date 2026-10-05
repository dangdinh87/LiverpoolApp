import { describe, expect, it, vi } from "vitest";

vi.mock("../supabase-service", () => ({ getServiceClient: () => ({}) }));
vi.mock("@/lib/prompts/current-facts", () => ({ buildCurrentFactsBlock: () => "## Current Facts\n- Liverpool head coach: Andoni Iraola." }));

import { parseDigestJson } from "../digest";

const good = { title: "Liverpool Daily", summary: "Tóm tắt.", sections: [{ category: "transfer", categoryVi: "Chuyển nhượng", headline: "h", body: "b", articleUrls: [] }] };

describe("parseDigestJson", () => {
  it("parses plain JSON and fenced JSON with prose around it", () => {
    expect(parseDigestJson(JSON.stringify(good)).title).toBe("Liverpool Daily");
    expect(parseDigestJson("Đây là kết quả:\n```json\n" + JSON.stringify(good) + "\n```\nHết.").sections).toHaveLength(1);
  });
  it("repairs raw newlines inside strings and trailing commas (long SEO article bodies)", () => {
    const broken = `{"title":"T","summary":"dòng một\ndòng hai","sections":[{"category":"x","headline":"h","body":"b","articleUrls":[],},],}`;
    const parsed = parseDigestJson(broken);
    expect(parsed.summary).toBe("dòng một\ndòng hai");
    expect(parsed.sections).toHaveLength(1);
  });
  it("rejects truncated output and missing fields so the next model is tried", () => {
    expect(() => parseDigestJson('{"title":"T","summary":"abc","sections":[{"cat')).toThrow();
    expect(() => parseDigestJson('{"title":"T"}')).toThrow(/Invalid digest structure/);
    expect(() => parseDigestJson("no json here")).toThrow();
  });
});
