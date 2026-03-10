# Liverpool FC Fan Website - API Integration Plan

## Decision: Hybrid API Approach (The Sports DB + API-Football)

### Phase 1: API Evaluation & Setup

#### 1.1 Register & Get API Keys
- [ ] Sign up at api-football.com (RapidAPI required)
- [ ] Sign up at thesportsdb.com (optional free key)
- [ ] Document rate limits: 100 req/day (API-Football), ~100-300 req/day (Sports DB)

#### 1.2 Create API Service Layer
```
src/services/
├── sportsdb.service.ts      (league standings, team metadata)
├── apifootball.service.ts   (squad, fixtures, stats, scorers)
├── cache.service.ts         (Redis/file-based caching)
└── football.utils.ts        (data normalization)
```

#### 1.3 Setup Environment
- Add `.env` with: `SPORTS_DB_KEY`, `API_FOOTBALL_KEY`, `CACHE_TTL`
- Configure cache invalidation (fixtures: 1h, standings: 2h, squad: 24h)

---

### Phase 2: Feature Implementation

#### 2.1 Homepage Highlights (Priority: HIGH)
**Data Source**: API-Football (fixtures) + The Sports DB (standings)
- Recent match: Last 3 fixtures with scores/date
- Next fixture: Upcoming match details
- Standings snippet: Liverpool's league position

**Endpoints**:
- `GET /api/fixtures?limit=5` → API-Football
- `GET /api/standings/epl` → The Sports DB

---

#### 2.2 Squad/Player List (Priority: HIGH)
**Data Source**: API-Football (primary, complete squad)
- Player cards: Photo, name, position, number, age
- Optional: Stats (appearances, goals, assists)

**Endpoints**:
- `GET /api/squad?season=2024` → API-Football `/teams/{id}` with `include=players`

---

#### 2.3 Fixtures & Results (Priority: HIGH)
**Data Source**: API-Football (reliable) + The Sports DB (fallback)
- Calendar view: All matches for season
- Match details: Date, time, opponent, venue, score
- Filter: Upcoming, results, by competition

**Endpoints**:
- `GET /api/fixtures?status=all&season=2024` → API-Football
- Cache: Invalidate 1h after match completion

---

#### 2.4 League Standings (Priority: MEDIUM)
**Data Source**: The Sports DB (simple) or API-Football (detailed)
- EPL table: Position, wins, draws, losses, GF, GA, GD, points
- Liverpool highlighted

**Endpoints**:
- `GET /api/standings/epl/2024` → The Sports DB (simpler)

---

#### 2.5 Top Scorers (Priority: MEDIUM)
**Data Source**: API-Football (only viable option)
- Liverpool top scorers
- League top scorers for context

**Endpoints**:
- `GET /api/scorers?team=liverpool&season=2024` → API-Football

---

#### 2.6 Club History & Trophies (Priority: LOW)
**Data Source**: LOCAL DATABASE + Curated Static Data
- **Do NOT rely on API-Football/Sports DB** - data is incomplete

**Implementation**:
```
Seed Database with:
- League titles (26x)
- FA Cups (8x)
- European Cups (6x)
- Other trophies
- Notable seasons/achievements
```

**Storage**: PostgreSQL table or JSON file in repo
```sql
CREATE TABLE trophies (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  competition VARCHAR(50),
  year INT,
  details TEXT
);
```

---

### Phase 3: Backend Structure

#### 3.1 Data Models
```typescript
// Squad Member
interface Player {
  id: number;
  name: string;
  position: string;
  number: number;
  age: number;
  photo?: string;
  nationality?: string;
}

// Fixture/Match
interface Fixture {
  id: number;
  date: Date;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  venue?: string;
  status: 'scheduled' | 'live' | 'finished';
}

// Standing
interface Standing {
  rank: number;
  team: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}
```

#### 3.2 API Routes
```
GET  /api/squad
GET  /api/fixtures
GET  /api/fixtures/:id
GET  /api/standings/epl
GET  /api/scorers
GET  /api/trophies
GET  /api/team/info
```

---

### Phase 4: Caching Strategy

| Resource | TTL | Invalidation |
|----------|-----|--------------|
| Squad | 24h | Daily refresh |
| Fixtures | 1h | On match completion |
| Standings | 2h | After matchweek |
| Top Scorers | 2h | After matchweek |
| Trophies | ∞ | Manual (rarely changes) |
| Team Info | 7d | Weekly refresh |

**Implementation**: Simple file-based cache (`.cache/`) or Redis (optional)

---

### Phase 5: Error Handling & Fallbacks

```typescript
// If API-Football fails for squad → Cache from previous request
// If standings fail → Use cached or previous season
// If fixtures fail → Show cached upcoming schedule
// Always gracefully degrade
```

---

## Technology Stack (Recommended)

- **Backend**: Node.js + Express (or Next.js API routes)
- **Cache**: Simple file-based (`.cache/`) or Redis
- **Database**: PostgreSQL (for trophies, comments, user data)
- **External APIs**: API-Football (primary), The Sports DB (secondary)

---

## Rate Limit Management

**Daily Budget: 200 requests**
- Homepage: 10 req/visit (squad 5, fixtures 3, standings 2)
- Squad page: 1 req (cached 24h)
- Fixtures page: 2 req (cached 1h)
- Estimated DAU: 15-20 visits = 150-200 req/day

**Optimization**:
1. Aggressive server-side caching
2. Batch API calls (1 request per endpoint per cache period)
3. Client-side caching (localStorage for UI state)

---

## Migration from Sports DB Alone

If starting with Sports DB only:
1. Implement API-Football in parallel
2. Gradually migrate endpoints (lowest risk first: standings → squad → fixtures)
3. Keep Sports DB as fallback for 2-3 weeks
4. Monitor data quality & stability

---

## Success Metrics

- [ ] All 6 features display correctly (with fallback data)
- [ ] API response time < 500ms (with cache)
- [ ] 99% uptime through caching
- [ ] No rate limit errors
- [ ] Data refreshes correctly per TTL
