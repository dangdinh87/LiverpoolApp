# Anfield Daily — Documentation

Developer and product documentation for **Anfield Daily** ([anfielddaily.com](https://anfielddaily.com)), an unofficial bilingual (`en` / `vi`) Liverpool FC news, briefing, post-match analysis, and match data platform.

## Core References

| Document | Description |
|---|---|
| [Brand Guidelines](brand.md) | Canonical brand identity, positioning lines, pitch-circle mark, typography, colour tokens, and editorial voice |
| [Codebase Summary](codebase-summary.md) | End-to-end overview of the Next.js 16.4 + Supabase + Cloudflare Workers architecture |

## English (`docs/en/`)

| Document | Description |
|---|---|
| [Getting Started](en/getting-started.md) | Prerequisites, environment variables, Supabase migrations, local dev & test commands |
| [Architecture](en/architecture.md) | System layers, Cloudflare Workers runtime, Supabase client split, caching, resilience & auth |
| [Code Standards](en/code-standards.md) | Server/Client boundaries, TypeScript rules, styling, motion, accessibility & testing checklists |
| [Design System](en/design-system.md) | Dark Stadium tokens, 4-font typography scale, `BrandMark`, `shadcn/ui` primitives & patterns |
| [Data Providers](en/data-providers.md) | Football-Data.org (`fdo-client` dedup/429 retry), ESPN events/stats, FPL player stats & broadcasters |
| [News System](en/news-system.md) | 13 English outlets + LFC YouTube, sync pipeline, full-article extraction, VietAPI briefing, translation & `/analysis` |
| [Internationalisation (i18n)](en/i18n.md) | `next-intl` routing (`/` EN, `/vi` VI), `pickClientMessages` RSC optimisation & parity tests |
| [SEO & AI Discovery](en/seo.md) | Metadata, canonical/hreflang parity, JSON-LD graph, `sitemap.xml`, `robots.txt` & `llms.txt` |
| [Deployment](en/deployment.md) | Cloudflare Workers (`@opennextjs/cloudflare`), R2/D1/DO caches, custom domains & GitHub Actions crons |

## Tiếng Việt (`docs/vi/`)

| Tài liệu | Mô tả |
|---|---|
| [Bắt Đầu](vi/getting-started.md) | Yêu cầu hệ thống, biến môi trường, khởi tạo database Supabase và các lệnh phát triển |
| [Kiến Trúc Hệ Thống](vi/architecture.md) | Thiết kế các tầng, Cloudflare Workers, phân tách Supabase client, bộ nhớ đệm, chống lỗi và xác thực |
| [Quy Chuẩn Mã Nguồn](vi/code-standards.md) | Ranh giới Server/Client, quy tắc TypeScript, Tailwind v4, chuyển động, khả năng tiếp cận và kiểm thử |
| [Hệ Thống Thiết Kế](vi/design-system.md) | Hệ màu Dark Stadium, 4 phông chữ, biểu trưng `BrandMark`, `shadcn/ui` và mẫu giao diện |
| [Nhà Cung Cấp Dữ Liệu](vi/data-providers.md) | Football-Data.org (`fdo-client`), ESPN (sự kiện & thống kê trận đấu), FPL API và lịch phát sóng |
| [Hệ Thống Tin Tức & AI](vi/news-system.md) | 13 đầu báo Anh + YouTube CLB, luồng đồng bộ, bóc tách toàn văn, bản tin AI, dịch bài và `/analysis` |
| [Đa Ngôn Ngữ (i18n)](vi/i18n.md) | Định tuyến `next-intl` (`/` tiếng Anh, `/vi` tiếng Việt), tối ưu `pickClientMessages` và kiểm thử song ngữ |
| [SEO & Khám Phá AI](vi/seo.md) | Metadata, đồng bộ canonical/hreflang, đồ thị JSON-LD, `sitemap.xml`, `robots.txt` và `llms.txt` |
| [Triển Khai](vi/deployment.md) | Triển khai Cloudflare Workers (`@opennextjs/cloudflare`), R2/D1/DO cache, tên miền và GitHub Actions |
| [Hỏi & Đáp Triển Khai](vi/deployment-faq.md) | Giải thích dễ hiểu về Cloudflare Workers, DNS, R2/D1 cache, biến môi trường, Supabase OAuth và cron |

## Historical Records & Wireframes

- Historical design specs: [`superpowers/`](superpowers/)
- Early HTML wireframes: [`wireframes/`](wireframes/)
