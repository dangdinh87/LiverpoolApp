import { describe, expect, it } from "vitest";
import { toAuthErrorCode } from "@/lib/auth-error-code";

describe("toAuthErrorCode", () => {
  it("reports an unreachable auth service as unavailable, not as bad input", () => {
    expect(toAuthErrorCode({ name: "AuthRetryableFetchError", status: 0, message: "breaker is open" })).toBe("unavailable");
    expect(toAuthErrorCode({ message: "fetch failed" })).toBe("unavailable");
    expect(toAuthErrorCode({ status: 522, message: "origin timed out" })).toBe("unavailable");
  });

  it("maps Supabase error codes", () => {
    expect(toAuthErrorCode({ status: 400, code: "invalid_credentials" })).toBe("invalidCredentials");
    expect(toAuthErrorCode({ status: 400, code: "email_not_confirmed" })).toBe("emailNotConfirmed");
    expect(toAuthErrorCode({ status: 422, code: "user_already_exists" })).toBe("userExists");
    expect(toAuthErrorCode({ status: 422, code: "weak_password" })).toBe("weakPassword");
    expect(toAuthErrorCode({ status: 429, code: "over_request_rate_limit" })).toBe("rateLimited");
  });

  it("falls back on status and message when there is no code", () => {
    expect(toAuthErrorCode({ status: 429 })).toBe("rateLimited");
    expect(toAuthErrorCode({ status: 400, message: "Invalid login credentials" })).toBe("invalidCredentials");
    expect(toAuthErrorCode({ status: 400, message: "something else" })).toBe("unknown");
  });
});
