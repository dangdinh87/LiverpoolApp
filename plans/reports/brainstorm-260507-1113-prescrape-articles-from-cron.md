# Brainstorm Report — Pre-scrape Article Content via Cron

**Date:** 2026-05-07 11:13 (Asia/Saigon)
**Owner:** vinhnguyen@selly.vn
**Scope:** LiverpoolApp — fix slow article load (5-15s on click)

## 1. Problem Statement

Khi user click vào article trên `/news/[...slug]`, server gọi `scrapeArticle(url)` → fetch HTML từ source → parse → render. Latency 5-15s gây UX rất tệ, user nản bỏ trang.

**Hiện tại:**
- Cron `0 6 * * * UTC` sync RSS metadata (title, url, summary, hero image) → Supabase `articles`
- Article body **KHÔNG** được pre-fetch — scrape on-demand mỗi click
- 24h cache TTL ở `content_en` cột (DB-level), nhưng lần đầu vẫn chậm
- Memory cache reset khi function cold start

**Constraints:**
- Vercel **Hobby** plan (free, không muốn upgrade Pro $20/mo)
- Vercel Hobby cho 2 cron daily — đã dùng cho cleanup + digest
- Site URL: https://www.liverpoolfcvn.blog
- Stack: Next.js 16 + Supabase + Groq + Cloudinary

## 2. Requirements

| Yêu cầu | Mức độ |
|---|---|
| Article render < 1s sau khi click | Must |
| Refresh content gần realtime (1-2h) | Should |
| Không tăng cost Vercel/Supabase đáng kể | Must |
| Fallback nếu pre-scrape fail | Must |
| Không phụ thuộc service tốn phí | Must |

## 3. Scale Profile (user-confirmed)

- < 50 article/ngày sync mới
- Đa số article được đọc → pre-scrape **toàn bộ** hợp lý
- 17 nguồn equal weight, không có "hot" sources
- Avg article HTML size: ~50KB
- Avg scrape time: ~5-15s/article

## 4. Approaches Evaluated

### A. Pre-scrape trong cron, store full content vào DB ✅ CHỌN

Sau khi sync RSS metadata, scrape full HTML cho article mới ngay trong cùng cron (parallel với concurrency limit). Article page chỉ đọc DB.

**Pros:**
- UX tối ưu: render từ DB ~50ms
- Reuse infra hiện tại (Supabase, scraper, schema)
- Cost thấp: <50 scrape/run, 50KB×50 = 2.5MB/day storage
- Fallback đơn giản: nếu DB miss → scrape on-demand (đã có code)

**Cons:**
- Function exec time tăng từ ~30s lên ~100-150s mỗi run
- Scrape ngay cả article ko ai đọc (chấp nhận được vì >50% được đọc)

### B. On-demand + streaming UI (skeleton + progressive render)

Show shell → stream content khi scrape xong.

**Pros:** Perceived speed cải thiện
**Cons:** Latency thực tế vẫn 5-15s. Phức tạp client-side. **Loại** vì không fix root cause.

### C. Pre-scrape on hover/intent (link prefetch)

Khi card hover hoặc viewport intersect → trigger scrape.

**Pros:** Lazy, cost thấp
**Cons:** Mobile không hover; cần JS phức tạp; first-impression user vẫn chậm. **Loại**.

### D. Vercel Queues background workers

Queue scrape job từ RSS sync, workers process async.

**Pros:** Scale tốt
**Cons:** Beta product; overkill cho 50/day; thêm 1 dependency. **Loại** YAGNI.

### E. Tăng cache TTL only

**Loại** ngay — không fix first-visit (đúng vấn đề user phản ánh).

## 5. Recommended Solution

### 5.1 Architecture

```
┌──────────────────────────────────────────────────┐
│  GitHub Actions (every 1 hour, FREE public repo) │
│  → POST /api/news/sync (with CRON_SECRET)        │
└──────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────┐
│  /api/news/sync on Vercel (extended)             │
│  1. Fetch RSS từ 17 sources                      │
│  2. Upsert metadata to articles table            │
│  3. NEW: identify articles thiếu content_en      │
│  4. NEW: scrape full content (5-8 parallel)      │
│  5. NEW: bulk upsert content_en + scraped_at     │
└──────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────┐
│  Supabase articles table                         │
│    metadata + content_en jsonb (full HTML)       │
└──────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────┐
│  /news/[...slug] page                            │
│  1. SELECT content_en FROM articles WHERE url=…  │
│  2. content_en exists → render (~50ms)           │
│  3. ELSE → fallback scrapeArticle() + cache      │
└──────────────────────────────────────────────────┘
```

### 5.2 Why GitHub Actions (not Vercel cron)?

| | Vercel Hobby | Vercel Pro | GitHub Actions |
|---|---|---|---|
| Crons/day | 2 | unlimited | unlimited |
| Cost | FREE | $20/mo | FREE (public repo) |
| Min interval | 1h | 1m | 5m |

GitHub Actions cho phép **chạy hourly miễn phí** mà không phải up Vercel Pro. Existing Vercel cron (cleanup, digest) vẫn dùng Hobby quota (2/2).

### 5.3 Database Strategy

- **Schema**: tận dụng `content_en jsonb` + `content_scraped_at timestamptz` (đã có)
- **Cleanup**: extend cron `/api/news/cleanup` (đã có) để NULL `content_en` cho article > 60 ngày → giữ storage thấp
- **Storage cap**: 50 articles/day × 50KB × 60 days = 150MB → fit Supabase free tier

### 5.4 Code Changes (high-level)

| File | Change |
|---|---|
| `src/lib/news/sync.ts` | Sau bulkUpsert, scrape content cho article thiếu `content_en` (parallel pool 5-8) |
| `src/lib/news/enrichers/article-extractor.ts` | Tách `scrapeArticle` thành `scrapeArticleNoCache` cho cron path (skip read-cache để force fresh) |
| `src/app/news/[...slug]/page.tsx` | Đọc `content_en` từ DB trước, fallback mới scrape |
| `src/app/api/news/cleanup/route.ts` | Thêm logic NULL content_en cho article > 60 days |
| `.github/workflows/news-sync.yml` | NEW: hourly cron gọi Vercel endpoint với `CRON_SECRET` |
| `vercel.json` | Bỏ schedule cũ của news/sync (giữ cleanup + digest) |

### 5.5 Concurrency & Timeout Math

- Avg scrape: 10s/article × 50 articles = 500s sequential
- Parallel pool 5: 50/5 × 10s = **100s** ✅ fit 300s function limit
- Parallel pool 8: 50/8 × 10s = **63s** (rủi ro source rate-limit nếu 17 source × 0.5/source)
- **Choose pool=5** (balance speed + courtesy với source servers)

### 5.6 Fallback Behavior

```typescript
// news/[...slug]/page.tsx (pseudo)
const article = await getArticleByUrl(url);
let content = article.content_en;
if (!content || stale(article.content_scraped_at)) {
  content = await scrapeArticle(url);  // existing on-demand path
  // existing 24h cache write fires
}
return <ArticleHtmlBody content={content} />;
```

User vẫn thấy article cũ nếu tồn tại trong DB; chỉ chậm khi DB hoàn toàn miss (rare sau khi pre-scrape rollout).

## 6. Cost Analysis

| Resource | Trước | Sau | Free Tier Limit |
|---|---|---|---|
| Vercel function exec | ~30s/day | ~2,400s/day (24 × 100s) | 100 GB-h/mo ✅ |
| Supabase storage | ~5MB | ~150MB | 500MB ✅ |
| GitHub Actions min | 0 | ~48 min/day | unlimited (public) ✅ |
| External fetches | 50/click | 50/hour pre-warm | n/a |

**Tổng: $0/month additional cost.**

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Scrape fail giữa cron | User click → fallback scrape (current behavior) | Keep on-demand fallback in slug page |
| Source HTML schema thay đổi | Articles thin/empty | Existing `extractor-sandbox.test.ts` regression test |
| Function timeout > 300s | Cron incomplete | Concurrency pool=5; alert if duration > 200s |
| Source rate-limit | 429 errors | 17 sources × ~3 articles each per hour = OK |
| GitHub Actions outage | Content stale | Hourly cron — nếu skip 1-2 lần ko critical |
| Storage growth | DB cost | Cleanup cron NULL content_en > 60 days |
| Article URL change | Old cache invalid | URL is unique key; new article = new row |

## 8. Success Metrics

| Metric | Target |
|---|---|
| Article TTFB (P95) | < 1s |
| DB cache hit rate | > 95% sau 24h |
| Sync cron duration | < 200s |
| Scrape success rate | > 95% |
| Storage growth | < 100MB/30 days |

Validation: Vercel Analytics + Supabase logs sau rollout 1 tuần.

## 9. Out of Scope

- Real-time webhook push từ source (RSS sync đã đủ near-realtime với 1h interval)
- AI summarization tại pre-scrape (giữ on-demand qua Groq translate button)
- CDN warming articles (Vercel ISR + DB cache đã đủ)
- Multi-region replication (overkill cho fan site VN)

## 10. Next Steps

1. ✅ Approval cho approach (đang chờ user xác nhận)
2. Generate detailed implementation plan (nếu user đồng ý)
3. Test trên branch trước rollout production
4. Monitor metrics tuần đầu

## 11. Unresolved Questions

- GitHub repo có thực sự **public** không? Nếu private → free tier 2000 min/mo (vẫn fit nhưng cần xác nhận)
- Cleanup TTL chính xác (đề xuất 60 ngày, có thể 30/90 tùy preference)
- Có cần emit notification (Slack/email) khi cron fail không? — out of scope hiện tại

---

**Recommended decision:** Implement approach A (pre-scrape in cron) với GitHub Actions hourly trigger.
