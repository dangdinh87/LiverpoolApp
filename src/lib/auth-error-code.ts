/**
 * Map a Supabase auth failure to a stable code the UI can translate.
 *
 * The auth server actions used to return `error.message` verbatim, so visitors
 * saw raw English internals — during an outage literally "Supabase unavailable:
 * skipping request while the connection breaker is open" — even in Vietnamese.
 */
export type AuthErrorCode =
  | "unavailable"
  | "invalidCredentials"
  | "emailNotConfirmed"
  | "userExists"
  | "weakPassword"
  | "rateLimited"
  | "unknown";

interface AuthErrorLike {
  code?: string;
  status?: number;
  name?: string;
  message?: string;
}

export function toAuthErrorCode(error: AuthErrorLike): AuthErrorCode {
  // No HTTP status (transport failure, timeout, open breaker) or a 5xx means
  // the auth service itself is unreachable — not a problem with the input.
  if (
    error.status === undefined ||
    error.status === 0 ||
    error.status >= 500 ||
    error.name === "AuthRetryableFetchError"
  ) {
    return "unavailable";
  }

  switch (error.code) {
    case "invalid_credentials":
      return "invalidCredentials";
    case "email_not_confirmed":
      return "emailNotConfirmed";
    case "user_already_exists":
    case "email_exists":
      return "userExists";
    case "weak_password":
      return "weakPassword";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "rateLimited";
  }
  if (error.status === 429) return "rateLimited";
  if (error.status === 400 && /invalid login credentials/i.test(error.message ?? "")) {
    return "invalidCredentials";
  }
  return "unknown";
}
