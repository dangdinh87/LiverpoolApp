# Vietnamese Football News Sources Research

## Findings

### 1. Bongda.com.vn ✅ RSS Available
- **Liverpool RSS**: `https://bongda.com.vn/liverpool.rss`
- **Premier League RSS**: `https://bongda.com.vn/premier-league.rss`
- **Transfer News RSS**: `https://bongda.com.vn/tin-chuyen-nhuong.rss`
- 92+ RSS channels total
- LFC-specific feed = ideal source
- Source: https://bongda.com.vn/main-rss.html

### 2. Bongdaplus.vn ❌ No RSS
- No RSS feeds found
- Need web scraping approach
- Liverpool tag page: `https://bongdaplus.vn/liverpool` (to verify)
- Would require cheerio/scraping setup
- Risk: fragile, breaks when site layout changes

### 3. 24h.com.vn ⚠️ General Football RSS
- Football RSS: `https://cdn.24h.com.vn/upload/rss/bongda.rss`
- NOT LFC-specific — general Vietnamese football
- Need to filter by "Liverpool" keyword in title
- May have low Liverpool content volume

## Recommendation
- **Phase 1**: RSS sources (Bongda.com.vn + BBC + Guardian + 24h filtered)
- **Phase 2**: Add Bongdaplus scraping as optional enhancement
- 24h filter by keyword "Liverpool" in title — simple but may miss articles
