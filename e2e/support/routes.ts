/** A public route exercised by the smoke sweep. */
export interface RouteUnderTest {
  path: string;
  /** Text or heading that proves the page rendered its own content. */
  expects: RegExp;
  /** Route requires auth and should bounce to the login page. */
  protected?: boolean;
}

/**
 * Every user-reachable page. Dynamic segments use a real, stable id so the
 * detail templates are covered too.
 */
export const ROUTES: RouteUnderTest[] = [
  { path: "/", expects: /liverpool/i },
  { path: "/news", expects: /news|tin t/i },
  { path: "/squad", expects: /squad|đội hình/i },
  { path: "/players", expects: /player|cầu thủ/i },
  { path: "/fixtures", expects: /fixture|lịch/i },
  { path: "/standings", expects: /standing|bảng/i },
  { path: "/stats", expects: /stat|thống kê/i },
  { path: "/season", expects: /fixtures|table|lịch|bảng/i },
  { path: "/gallery", expects: /anfield|all|squad|legends/i },
  { path: "/history", expects: /history|lịch sử|trophy|danh hiệu/i },
  { path: "/about", expects: /about|giới thiệu/i },
  { path: "/legal", expects: /legal|privacy|điều khoản|riêng tư/i },
  { path: "/chat", expects: /liverbird|ai assistant|trợ lý/i },
  { path: "/auth/login", expects: /sign in|đăng nhập/i },
  { path: "/auth/register", expects: /create account|join|đăng ký/i },
  { path: "/profile", expects: /sign in|đăng nhập/i, protected: true },
];
