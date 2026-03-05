# News APIs & RSS Feeds Research

## Current State
- Single source: BBC Sport RSS (`feeds.bbci.co.uk/sport/football/teams/liverpool/rss.xml`)
- `rss-parser` npm package for parsing
- No images (BBC RSS `media:thumbnail` rarely populated)
- Mock fallback when RSS fails

## Available RSS Feeds (Free, Unlimited)

| Source | URL | Images? | Quality |
|--------|-----|---------|---------|
| BBC Sport LFC | `https://feeds.bbci.co.uk/sport/football/teams/liverpool/rss.xml` | Rarely | High |
| Sky Sports Football | `https://www.skysports.com/rss/12040` | Yes (enclosure) | High |
| Guardian Football | `https://www.theguardian.com/football/liverpool/rss` | Yes (media:content) | High |
| Liverpool Echo | `https://www.liverpoolecho.co.uk/all-about/liverpool-fc/?service=rss` | Yes | Medium |
| ESPN FC | `https://www.espn.com/espn/rss/soccer/news` | Sometimes | Medium (not LFC-specific) |

## News APIs (Free Tiers)

| API | Free Limit | LFC Filter | Images | Notes |
|-----|-----------|------------|--------|-------|
| NewsAPI.org | 100 req/day | `q=Liverpool+FC` | Yes | Best free tier, but dev only (no prod) |
| GNews.io | 100 req/day | topic+search | Yes | Production OK, 10 articles/req |
| MediaStack | 500 req/month | keyword search | No | Low limit |

## Recommendation: Multi-Source RSS Aggregation
- **Primary**: BBC Sport (reliable, high quality)
- **Secondary**: Sky Sports, Guardian (images, different perspective)
- **No API key needed**, unlimited requests
- Cache: 30min revalidation (current), good for RSS
- Dedup by URL or title similarity (Jaccard/Levenshtein)
- Extract images from `media:thumbnail`, `media:content`, `enclosure` tags

## Image Extraction from RSS
- BBC: `<media:thumbnail>` (url attr) — sometimes present
- Sky Sports: `<enclosure url="..." type="image/jpeg"/>` — reliable
- Guardian: `<media:content url="..." medium="image"/>` — reliable
- Fallback: Generate OG image or use default LFC-themed placeholder

## Caching Strategy
- Server-side fetch with `React.cache()` + Next.js ISR `revalidate: 1800`
- Aggregate all feeds in single function, merge & sort by date
- Store source attribution per article
