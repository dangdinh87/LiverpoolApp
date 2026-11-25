import { getPlayerBySlug } from "@/lib/squad-data";

export interface SiteRoute {
  path: string;
  label: { en: string; vi: string };
  desc: string;
  keywords: string[];
  auth?: boolean;
}

export const SITE_ROUTES: readonly SiteRoute[] = [
  {
    path: "/",
    label: { en: "Home", vi: "Trang chủ" },
    desc: "Front page with next match countdown, daily briefing, latest news, analysis and table snapshot.",
    keywords: ["home", "trang chu", "trang chủ", "overview"],
  },
  {
    path: "/news",
    label: { en: "News Roundup", vi: "Tin tức" },
    desc: "De-duplicated Liverpool FC stories from 13 English outlets, podcasts, YouTube and Bluesky.",
    keywords: ["news", "tin tuc", "tin tức", "bao chi", "podcast", "video"],
  },
  {
    path: "/news/digest",
    label: { en: "Daily Briefing", vi: "Bản tin hằng ngày" },
    desc: "Daily summarised Liverpool news briefing curated from the English sports press.",
    keywords: ["digest", "briefing", "ban tin", "bản tin", "tom tat", "tóm tắt"],
  },
  {
    path: "/analysis",
    label: { en: "Match Analysis", vi: "Phân tích trận đấu" },
    desc: "Original pre-match previews and post-match reviews built from verified match data.",
    keywords: ["analysis", "phan tich", "phân tích", "preview", "review", "nhan dinh", "nhận định"],
  },
  {
    path: "/fixtures",
    label: { en: "Fixtures & Results", vi: "Lịch thi đấu & Kết quả" },
    desc: "Upcoming Liverpool matches, kick-off times, live match centre, line-ups and recent results.",
    keywords: ["fixtures", "schedule", "results", "lich dau", "lịch đấu", "lich thi dau", "lịch thi đấu", "ket qua", "kết quả", "match"],
  },
  {
    path: "/standings",
    label: { en: "League Standings", vi: "Bảng xếp hạng" },
    desc: "Premier League and Champions League tables with form, points and goal difference.",
    keywords: ["standings", "table", "bxh", "bang xep hang", "bảng xếp hạng", "premier league", "champions league", "ucl"],
  },
  {
    path: "/squad",
    label: { en: "First-Team Squad", vi: "Đội hình" },
    desc: "Current Liverpool first-team squad by position, shirt numbers and head coach.",
    keywords: ["squad", "doi hinh", "đội hình", "lineup", "coach", "hlv"],
  },
  {
    path: "/players",
    label: { en: "Players Directory", vi: "Danh sách cầu thủ" },
    desc: "Browse all first-team players with quick links to individual profiles and stats.",
    keywords: ["players", "cau thu", "cầu thủ", "roster"],
  },
  {
    path: "/injuries",
    label: { en: "Injuries & Availability", vi: "Chấn thương & Lực lượng" },
    desc: "Injury watch, doubts, suspensions and player availability updates.",
    keywords: ["injuries", "injury", "chan thuong", "chấn thương", "vang mat", "vắng mặt", "availability"],
  },
  {
    path: "/transfers",
    label: { en: "Transfers & Loans", vi: "Chuyển nhượng & Cho mượn" },
    desc: "Latest transfer reporting and players currently out on loan.",
    keywords: ["transfers", "transfer", "loan", "chuyen nhuong", "chuyển nhượng", "cho muon", "cho mượn"],
  },
  {
    path: "/stats",
    label: { en: "Season Statistics", vi: "Thống kê mùa giải" },
    desc: "Liverpool season overview, form timeline, competition breakdown and milestones.",
    keywords: ["stats", "statistics", "thong ke", "thống kê", "phong do", "phong độ"],
  },
  {
    path: "/season",
    label: { en: "Season Archive", vi: "Lưu trữ mùa giải" },
    desc: "Season-by-season Liverpool results and historical campaign overview.",
    keywords: ["season", "archive", "mua giai", "mùa giải"],
  },
  {
    path: "/predictions",
    label: { en: "Fan Predictions", vi: "Dự đoán tỷ số" },
    desc: "Predict upcoming match scores without signing in and check the fan prediction leaderboard.",
    keywords: ["predictions", "predict", "du doan", "dự đoán", "leaderboard"],
  },
  {
    path: "/history",
    label: { en: "Club History", vi: "Lịch sử CLB" },
    desc: "Liverpool FC trophy cabinet, club timeline, legends and Anfield showcase.",
    keywords: ["history", "trophies", "legends", "anfield", "lich su", "lịch sử", "danh hieu", "danh hiệu", "huyen thoai"],
  },
  {
    path: "/gallery",
    label: { en: "Photo Gallery", vi: "Thư viện ảnh" },
    desc: "Curated Anfield and Liverpool FC photography gallery.",
    keywords: ["gallery", "photos", "anh", "ảnh", "thu vien", "thư viện"],
  },
  {
    path: "/profile",
    label: { en: "Profile", vi: "Hồ sơ cá nhân" },
    desc: "Signed-in reader profile, favourite players and saved articles.",
    keywords: ["profile", "saved", "favourites", "tai khoan", "tài khoản", "ho so", "hồ sơ"],
    auth: true,
  },
  {
    path: "/about",
    label: { en: "About Anfield Daily", vi: "Giới thiệu" },
    desc: "Editorial mission, independent status and site background.",
    keywords: ["about", "gioi thieu", "giới thiệu", "anfield daily"],
  },
  {
    path: "/legal",
    label: { en: "Legal & Sources", vi: "Pháp lý & Nguồn tin" },
    desc: "Copyright, privacy policy, news attribution and unofficial disclaimer.",
    keywords: ["legal", "privacy", "sources", "phap ly", "pháp lý", "nguon tin", "nguồn tin"],
  },
];

/** Strip locale prefixes (`/vi`, `/en`), query strings, hashes, and trailing slashes. */
export function normalizeAssistantPath(rawPath: string): string {
  const withoutOrigin = rawPath.trim().replace(/^https?:\/\/[^/]+/i, "");
  const clean = withoutOrigin.split(/[?#]/)[0] ?? "";
  let path = clean.startsWith("/") ? clean : `/${clean}`;
  path = path.replace(/^\/(vi|en)(?=\/|$)/, "") || "/";
  if (path.length > 1) path = path.replace(/\/+$/, "");
  return path;
}

export type PathValidationResult =
  | { ok: true; path: string; label: string }
  | { ok: false; error: string };

/**
 * Validate a route path before rendering a navigation card in the UI so the
 * model can never invent a broken 404 link.
 */
export function validateAssistantPath(
  rawPath: string,
  locale: "en" | "vi",
): PathValidationResult {
  const path = normalizeAssistantPath(rawPath);

  const staticRoute = SITE_ROUTES.find((r) => r.path === path);
  if (staticRoute) {
    return { ok: true, path, label: staticRoute.label[locale] };
  }

  const playerMatch = /^\/player\/([a-z0-9-]+)$/.exec(path);
  if (playerMatch) {
    const player = getPlayerBySlug(playerMatch[1]);
    if (player) {
      return { ok: true, path, label: player.name };
    }
    return { ok: false, error: `Unknown player slug: ${playerMatch[1]}` };
  }

  const fixtureMatch = /^\/fixtures\/(\d+)$/.exec(path);
  if (fixtureMatch) {
    return {
      ok: true,
      path,
      label:
        locale === "vi"
          ? `Trung tâm trận đấu #${fixtureMatch[1]}`
          : `Match Centre #${fixtureMatch[1]}`,
    };
  }

  const analysisMatch = /^\/analysis\/([a-z0-9-]+)$/.exec(path);
  if (analysisMatch) {
    return {
      ok: true,
      path,
      label: locale === "vi" ? "Bài phân tích trận đấu" : "Match Analysis",
    };
  }

  const digestMatch = /^\/news\/digest\/(\d{4}-\d{2}-\d{2})$/.exec(path);
  if (digestMatch) {
    return {
      ok: true,
      path,
      label:
        locale === "vi"
          ? `Bản tin ${digestMatch[1]}`
          : `Daily Briefing ${digestMatch[1]}`,
    };
  }

  return { ok: false, error: `Route ${path} does not exist on this site.` };
}
