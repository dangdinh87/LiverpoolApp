import { describe, expect, it } from "vitest";
import { describeDigestWindow } from "../digest-window";

describe("describeDigestWindow", () => {
  it("describes the widened article windows", () => {
    expect(describeDigestWindow(24)).toBe("24 hours");
    expect(describeDigestWindow(72)).toBe("3 days");
    expect(describeDigestWindow(24 * 7)).toBe("7 days");
  });
});
