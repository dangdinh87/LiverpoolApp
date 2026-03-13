# Znews.vn RSS Feed Verification Report

**Date**: 2026-03-11
**Project**: LiverpoolApp
**Research Focus**: Vietnamese news RSS feed sources for sports/football content

---

## Executive Summary

Found **ONE valid RSS feed** from znews.vn. The feed contains sports content including Liverpool coverage. Old zingnews.vn domain redirects to znews.vn but does not have working RSS endpoints.

---

## RSS Feed Testing Results

### Valid Feeds

| URL | Status | Content | Liverpool Articles |
|-----|--------|---------|-------------------|
| `https://znews.vn/rss/the-thao.rss` | **HTTP 200** ✅ | Sports (Thể thao) | **YES** - Multiple recent articles |

### Invalid/Non-existent Feeds

| URL | Status | Issue |
|-----|--------|-------|
| `https://znews.vn/the-thao.rss` | HTTP 404 | Path not found |
| `https://zingnews.vn/the-thao.rss` | HTTP 301 → 404 | Redirects to znews.vn/the-thao.rss (404) |
| `https://znews.vn/rss/bong-da.rss` | HTTP 404 | Path not found |
| `https://znews.vn/bong-da.rss` | HTTP 404 | Path not found |
| `https://znews.vn/the-thao/bong-da.rss` | HTTP 404 | Path not found |

---

## Valid Feed Details

### Feed: `https://znews.vn/rss/the-thao.rss`

**Metadata:**
- **Title**: Thể thao - Znews RSS
- **Feed URL**: https://znews.vn/rss/the-thao.rss
- **Generator**: Znews
- **RSS Version**: 2.0
- **Last Updated**: Wed, 11 Mar 2026 11:31:09 +0700

**Feed Structure:**
- Valid XML with proper RSS 2.0 structure
- Includes `slash:comments` namespace
- 415+ lines of content (full feed)
- Uses CDATA for article descriptions with embedded images

**Content Sample:**
The feed covers general sports news with focus on international football (Premier League, Champions League, World Cup, AFC Champions League).

---

## Liverpool Content Found

**Multiple Liverpool articles detected in feed:**

1. **"5 điểm nhấn của Liverpool trước Galatasaray"** (5 highlights of Liverpool vs Galatasaray)
   - Recent match analysis from Champions League Round of 16
   - Link: https://znews.vn/5-diem-nhan-cua-liverpool-truoc-galatasaray-post1633988.html

2. **"Rooney bật cười khi Liverpool thua trận"** (Rooney laughs at Liverpool loss)
   - Wayne Rooney's reaction to Liverpool vs Galatasaray
   - Link: https://znews.vn/rooney-bat-cuoi-khi-liverpool-thua-tran-post1633979.html

3. **"Khoảnh khắc phòng ngự tệ hại của sao Liverpool"** (Liverpool player's terrible defensive moment)
   - Focus on Ibrahima Konaté's defensive error vs Galatasaray
   - Link: https://znews.vn/khoanh-khac-phong-ngu-te-hai-cua-sao-liverpool-post1633976.html

4. **"Liverpool 'phơi áo' tại Thổ Nhĩ Kỳ"** (Liverpool embarrassed in Turkey)
   - Match result coverage: Liverpool 0-1 Galatasaray
   - Link: https://znews.vn/liverpool-phoi-ao-tai-tho-nhi-ky-post1633883.html

5. **Additional mentions:**
   - Joey Barton incident in Liverpool (non-football context)

---

## Recommendations for LiverpoolApp

### ✅ Proceed With
- **Use**: `https://znews.vn/rss/the-thao.rss` as Vietnamese sports feed source
- Verified working, contains Liverpool coverage, proper RSS 2.0 structure
- Images included in descriptions (photo.znews.vn CDN)

### Implementation Notes
1. Feed updates frequently (live sports coverage)
2. Articles include full image URLs (can extract for thumbnails)
3. CDATA formatting handles special characters correctly
4. Links are properly structured for deep-linking
5. Language: Vietnamese (matches app's vi locale)

### Optional Enhancements
- Consider filtering articles by keywords (Liverpool, Quỷ đỏ, etc.) since feed includes all sports
- Revalidate monthly to detect any future URL changes
- Set cache revalidation to 30-60 minutes for live updates

---

## Migration Path from Zingnews

- **Old domain**: zingnews.vn still responds (301 redirects)
- **New domain**: znews.vn (current, active)
- **Recommendation**: Update adapters to use znews.vn exclusively
- **Backward compatibility**: Not needed (zingnews redirects are broken for RSS)

---

## Unresolved Questions

None. All URL variations tested and findings conclusive.
