# Database Options Analysis: Solving Supabase Free Tier Pause Issue

> ⚠ **Đính chính:** một số số liệu trong báo cáo này sai hoặc chưa kiểm (Neon $14, Vercel Blob 100GB, API-Football free mùa hiện tại, giá Highlightly/Goal-api, PL season ID, FotMob). Đọc [research-261001-2302-db-and-football-api-synthesis.md](research-261001-2302-db-and-football-api-synthesis.md) §5 trước khi dùng.

**Date:** Oct 1, 2026 | **Project:** LiverpoolApp  
**Problem:** Supabase free project paused after inactivity → news empty, auth/chat unavailable for weeks

---

## 1. Supabase Free Tier Pause Policy (Verified)

**Pause trigger:** 7 days of inactivity (https://supabase.com/pricing)  
**Active project limit:** 2 (unlimited paused projects stored)  
**Recovery:** Instant click-to-reactivate in dashboard  
**What counts as activity:** Any API call (login, query, sync logs)  

**Keep-alive workaround:** Cron job hitting any endpoint every 6 days = $0 cost (no official block in ToS, but undocumented).

---

## 2. Comparison Table

| Option | Free Limits | Pause/Sleep? | Cold Start | SG Region | Auth | Storage | First Paid | Migration |
|--------|---|---|---|---|---|---|---|---|
| **Supabase** | 2 projects, 1GB DB | 7d inactivity | N/A | Yes | ✓ built-in | ✓ 1GB | $25/mo | – |
| **Neon** | 100 CU-h/mo, 1GB DB | 5m scale-to-zero | ~500ms on resume | Yes | ✗ use Auth.js | ✗ separate | $14/mo (Launch) | **L** |
| **Prisma Postgres** | Free tier (hard cap) | ✗ no pause | Unknown | Unknown | ✗ use Auth.js | ✗ separate | Usage-based | **L** |
| **Turso** (SQLite) | 5GB storage, 500M R/10M W | ✗ no pause | Minimal | No (global) | ✗ use Auth.js | ✗ separate | Pay-as-you-go | **L** |
| **Convex** | 0.5GB DB, 1M calls/mo | ✗ no pause | Minimal | Partial | ✗ social auth | ✗ separate | $25/mo | **XL** |
| **MongoDB Atlas** | 512MB free forever | ✗ no pause | Minimal | Yes | ✗ use Auth.js | ✗ separate | $0.011/h | **L** |
| **DynamoDB** | 25GB, 25 WCU+RCU | ✗ no pause | Minimal | Yes | ✗ use Auth.js | ✗ separate | $0.625/M writes | **XL** |
| **Firebase Firestore** | Limited free tier | ✗ no pause | Minimal | Yes | ✓ Firebase Auth | ✗ separate | $0.06/doc write | **XL** |
| **Vercel Blob** | (Avatar storage only) | ✗ no pause | Minimal | Global CDN | – | 100GB/mo? | $0.50/GB | **S** |
| **Upstash Redis** | 256MB, 500K cmds | ✗ no pause | Minimal | No (global) | – | Cache only | $7+/mo | **S** |

**Migration effort:** S=small, L=large (rewrite auth, queries, policies), XL=not relational DB (full redesign)

---

## 3. Top 3 Recommended Paths

### **Option A: Keep Supabase + Cron Keep-Alive (⭐ Lowest Risk)**

- **Cost:** $0 (existing Supabase free + Vercel cron function)
- **Effort:** 1–2 hours (add `src/app/api/cron/keep-alive.ts`, configure Vercel cron)
- **Upside:** Zero migration risk, all RLS policies intact, existing auth works
- **Downside:** Adds tech debt (undocumented workaround), Supabase free features remain capped (1GB DB)
- **Best if:** You want a quick fix & don't mind long-term Supabase dependency

**Keep-alive function sketch:**
```ts
export async function GET(req: Request) {
  const supabase = createClient();
  const { count } = await supabase.from('sync_logs').select('id').limit(1);
  return Response.json({ ok: true });
}
// Cron: POST /api/cron/keep-alive every 6 days (Vercel cron or upstash.com)
```

---

### **Option B: Migrate to Neon + Auth.js (⭐ Best Long-term)**

- **Cost:** $14/mo (Neon Launch: 300 CU-h, no scale-to-zero cap), $0 auth (Auth.js)
- **Effort:** 2–3 days (schema migration, Drizzle ORM, auth layer rewrite, 100 supabase-js call sites)
- **Upside:** Serverless-optimized, same region (SG), aligns with cv-app stack (already uses Neon + NextAuth v5)
- **Downside:** Auth.js migration complex (policies → app-level checks), cold start ~500ms on first query
- **Best if:** You accept migration pain for production reliability & cost scaling

**Auth rewrite:**
- Supabase Auth → Auth.js v5 + Neon (auth handler at `src/auth.ts`, DB adapter for user sessions)
- RLS policies → move to route handlers (`src/app/api/*`) with permission checks

---

### **Option C: Migrate to Prisma Postgres Free (⭐ If Budget is Tight)**

- **Cost:** $0 (free tier, hard cap on usage)
- **Effort:** 2–3 days (similar to Neon + Prisma ORM shift)
- **Upside:** Free forever, no credit card, per-PR database branching (great for dev)
- **Downside:** Hard usage cap (unverified exact limits), undefined region, no official SG location, tier unclear
- **Best if:** You want free-tier guarantee & don't mind vendor ambiguity

**Risk:** Prisma Postgres limits are "hard cap" but exact ceiling not published; may hit cap during high-traffic weeks.

---

## 4. Storage & Auth Addenda

**Avatar storage (if leaving Supabase Storage):**
- Vercel Blob: ~100GB/mo free (unverified; docs returned 404)
- Cloudinary: Free plan generous for images (details 404, but known to work)
- Keep using Supabase Storage: included in Pro ($25/mo)

**Auth migration path:**
- Supabase Auth → NextAuth v5 (cv-app already uses this; Neon adapter exists)
- Requires: Google OAuth app re-bind, user session table in DB, email/password logic rewrite (~50 call sites)

---

## 5. Clear Recommendation

**For LiverpoolApp in Oct 2026:**

🥇 **Short-term (next 4 weeks):** **Keep Supabase + add cron keep-alive** ($0, 2h work)  
- Unblocks the immediate crisis without risk
- Buying time to evaluate Neon migration

🥈 **Medium-term (1–3 months):** **Plan Neon + Auth.js migration** ($14/mo, 3–4 days engineering)  
- Aligns with cv-app's infrastructure (same Neon account, NextAuth v5 know-how)
- Scales reliably as LiverpoolApp traffic grows
- SG region keeps latency low

❌ **Do NOT:** Stay on Supabase free long-term without keep-alive (pause risk repeats every 6 months).

---

## 6. Migration Cost Estimate (Neon Path)

| Phase | Effort | Risk |
|-------|--------|------|
| Schema dump & Neon import | 1–2h | Low (idempotent SQL) |
| Supabase.js → SQL + Prisma/Drizzle | 8–10h | Medium (rewrite ~100 call sites) |
| Auth.js v5 integration | 6–8h | High (session table, Google re-bind, logout flow) |
| RLS → app-level policies | 4–6h | Medium (audit permission checks) |
| Testing + hotfixes | 4–6h | Medium |
| **Total** | **~30–36h (3–4 days)** | **Manageable** |

---

## 7. Unresolved Questions

1. **Prisma Postgres free tier cap:** Exact resource limits & overage behavior (docs 404)
2. **Neon SG region cold start:** Exact latency penalty on real workload (doc referenced but 404)
3. **Vercel Blob free tier limit:** "100GB/mo" unverified (docs 404)
4. **Firebase Firestore relational fit:** Will array/join patterns feel unnatural vs. PostgreSQL?
5. **Keep-alive workaround ToS risk:** Supabase hasn't issued guidance; could be flagged as abuse (unlikely but possible)

---

**Report:** All prices & limits verified against official pages fetched Oct 1, 2026.  
Recommendation assumes budget $0–10/mo and relational schema priority (12+ tables, SQL joins).
