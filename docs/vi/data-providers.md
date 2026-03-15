# Data Providers

Lớp dữ liệu bóng đá của LiverpoolApp — pattern provider giúp tách ứng dụng khỏi sự phụ thuộc vào bất kỳ API đơn lẻ nào.

---

## 1. Tổng Quan

Toàn bộ dữ liệu bóng đá đều đi qua một abstract provider interface. Các provider dịch response từ API bên ngoài về canonical types. Barrel (`src/lib/football/index.ts`) bọc mọi hàm trong `React.cache()` để dedup trong cùng một request và re-export chúng dưới dạng named functions.

```
Người dùng truy cập /squad
     ↓
SquadPage (server component)
     ↓
await getSquad()         ← import từ '@/lib/football'
     ↓
React.cache wrapper      ← dedup trong cùng một request
     ↓
provider.getSquad()      ← FdoProvider (hoặc MockProvider khi dev)
     ↓
fdoFetch('/teams/64/..') ← HTTP call với ISR revalidation
     ↓
map to Player[]          ← canonical types từ src/lib/types/football.ts
     ↓
trả về component
```

### Các file chính

| File | Mục đích |
|------|---------|
| `src/lib/football/provider.ts` | Interface `FootballDataProvider` |
| `src/lib/football/index.ts` | Factory + barrel export + wrappers `React.cache()` |
| `src/lib/football/fdo-provider.ts` | Triển khai Football-Data.org |
| `src/lib/football/fdo-standings.ts` | Bảng xếp hạng PL + UCL (FDO) |
| `src/lib/football/fdo-matches.ts` | Lịch thi đấu + thông tin HLV (FDO) |
| `src/lib/football/espn-events.ts` | Sự kiện trận đấu, đội hình, lịch cup (ESPN) |
| `src/lib/football/mock-provider.ts` | Mock fallback tĩnh |
| `src/lib/football/mock-data.ts` | Hằng số mock (`MOCK_SQUAD`, v.v.) |
| `src/lib/football/fpl-stats.ts` | Thống kê cầu thủ bổ sung từ FPL API |
| `src/lib/types/football.ts` | Định nghĩa canonical types |

---

## 2. Provider Interface

`src/lib/football/provider.ts`

```typescript
export interface FootballDataProvider {
  readonly name: string;

  getSquad(): Promise<Player[]>;
  getFixtures(): Promise<Fixture[]>;
  getStandings(): Promise<Standing[]>;
  getTopScorers(): Promise<TopScorer[]>;
  getTopAssists(): Promise<TopScorer[]>;
  getPlayerStats(playerId: number): Promise<PlayerStats | null>;
  getFixtureEvents(fixtureId: number): Promise<FixtureEvent[]>;
  getFixtureLineups(fixtureId: number): Promise<FixtureLineup[]>;
  getFixtureStatistics(fixtureId: number): Promise<FixtureTeamStats[]>;
  getInjuries(): Promise<Injury[]>;
  getTeamInfo(): Promise<TeamInfo | null>;
  getCoach(): Promise<Coach | null>;
  getGameweekInfo(): Promise<GameweekInfo | null>;
}
```

Tất cả kiểu trả về đều từ `src/lib/types/football.ts`. Các provider phải ánh xạ cấu trúc API của mình về các canonical types này.

---

## 3. Football-Data.org (Chính)

**File:** `src/lib/football/fdo-provider.ts`
**API:** `https://api.football-data.org/v4`
**ID Liverpool trong FDO:** 64 (ánh xạ về canonical ID 40 trong responses)
**Env var:** `FOOTBALL_DATA_ORG_KEY`

### Dữ liệu cung cấp

| Dữ liệu | Endpoint | Revalidation |
|------|----------|-------------|
| Đội hình + tiểu sử cầu thủ | Local `squad.json` + FDO enrichment | Tĩnh |
| Bảng xếp hạng PL | `/competitions/PL/standings` | 6h |
| Bảng xếp hạng UCL | `/competitions/CL/standings` | 6h |
| Tất cả lịch thi đấu | `/teams/64/matches` | 1h |
| Thông tin HLV | `/teams/64` | 24h |
| Top ghi bàn | `/competitions/PL/scorers` | 6h |
| Top kiến tạo | `/competitions/PL/scorers?limit=20` | 6h |

### Giới hạn rate (gói miễn phí)

- **10 requests / phút**
- Dữ liệu mùa giải: 2022, 2023, 2024 (mùa 2025 bị khóa trên gói miễn phí)
- Tất cả hàm dùng `next: { revalidate }` qua `fetch()` — hiếm khi đạt giới hạn rate trên production

### Thiết lập API key

```bash
# .env.local
FOOTBALL_DATA_ORG_KEY=your_key_here
```

Lấy key tại [football-data.org/client/register](https://www.football-data.org/client/register). Gói miễn phí đủ cho toàn bộ tính năng hiện tại.

### Core fetcher

```typescript
// src/lib/football/fdo-provider.ts
const FDO_BASE = 'https://api.football-data.org/v4';

async function fdoFetch<T>(path: string, revalidate: number): Promise<T> {
  const key = process.env.FOOTBALL_DATA_ORG_KEY;
  if (!key) throw new Error('[fdo-provider] FOOTBALL_DATA_ORG_KEY not set');

  const res = await fetch(`${FDO_BASE}${path}`, {
    headers: { 'X-Auth-Token': key },
    next: { revalidate },
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) throw new Error(`[fdo-provider] HTTP ${res.status} on ${path}`);
  return res.json();
}
```

### Hạn chế đã biết

- `getPlayerStats()` ủy thác sang FPL API (Fantasy Premier League) — không có bộ lọc giải đấu, cầu thủ không có thống kê PL có thể trả về thống kê từ giải đấu khác
- Mùa 2025 không khả dụng trên gói miễn phí
- Không có sự kiện trận đấu với dữ liệu phút chính xác (dùng ESPN cho mục đích này)

---

## 4. ESPN (Bổ Sung)

**File:** `src/lib/football/espn-events.ts`
**API:** `https://site.api.espn.com/apis/site/v2/sports/soccer`
**ID Liverpool trong ESPN:** `364`
**Env var:** không cần — miễn phí, không cần key

### Dữ liệu cung cấp

| Dữ liệu | Phạm vi |
|------|---------|
| Sự kiện trận đấu (bàn thắng, thẻ, thay người) | Dữ liệu phút chính xác |
| Đội hình trận đấu | Đội hình xuất phát + dự bị |
| Chi tiết trận đấu | Sân vận động, khán giả, trọng tài, 28 thống kê mỗi đội |
| Lịch cup | FA Cup (`eng.fa`), EFL Cup (`eng.league_cup`) |

ESPN được dùng là **nguồn ưu tiên cho chi tiết trận đấu** vì nó cung cấp dữ liệu phút mà FDO không có. Barrel triển khai chuỗi fallback:

```typescript
// src/lib/football/index.ts
export const getFixtureEvents = cache(async (id: number, fixtureDate?: string) => {
  if (fixtureDate) {
    try {
      const espnEvents = await getEspnMatchEvents(fixtureDate);
      if (espnEvents.length > 0) return espnEvents; // ESPN được ưu tiên
    } catch (err) {
      console.error('[football] ESPN events failed:', err);
    }
  }
  return provider.getFixtureEvents(id); // FDO fallback
});
```

### League slugs

```typescript
const LEAGUE_SLUGS = ['eng.1', 'uefa.champions', 'eng.fa', 'eng.league_cup'];
```

---

## 5. Mock Provider (Fallback Khi Dev)

**File:** `src/lib/football/mock-provider.ts`
**Dữ liệu:** `src/lib/football/mock-data.ts`

Tự động được dùng khi `FOOTBALL_DATA_ORG_KEY` không được đặt. Trả về dữ liệu tĩnh xác định — không có network calls, không có giới hạn rate.

```typescript
// mock-provider.ts
export class MockProvider implements FootballDataProvider {
  readonly name = 'mock';
  async getSquad(): Promise<Player[]> { return MOCK_SQUAD; }
  async getFixtures(): Promise<Fixture[]> { return MOCK_FIXTURES; }
  // ... tất cả các method của interface đều trả về hằng số mock
}
```

Để buộc dùng mock khi phát triển:

```bash
# Cách 1: xóa key khỏi .env.local
# Cách 2: override tường minh (chưa có cơ chế này — chỉ cần unset key)
unset FOOTBALL_DATA_ORG_KEY && npm run dev
```

Console sẽ log: `[football] Provider: fdo, FDO key: no` và các hàm sẽ trả về mảng rỗng kèm cảnh báo — mở rộng `MockProvider` nếu bạn cần dữ liệu dev phong phú hơn.

---

## 6. Barrel Export & React.cache()

`src/lib/football/index.ts` là **điểm vào duy nhất** để sử dụng football data. Không bao giờ import trực tiếp từ các file provider.

```typescript
// ĐÚNG
import { getSquad, getFixtures, getStandings } from '@/lib/football';

// SAI — không bao giờ làm thế này
import { FdoProvider } from '@/lib/football/fdo-provider';
```

Barrel áp dụng `React.cache()` cho mọi export:

```typescript
import 'server-only';
import { cache } from 'react';

export const getSquad = cache(() => provider.getSquad());
export const getStandings = cache(async (season?: number) => { ... });
export const getPlayerStats = cache((id: number) => provider.getPlayerStats(id));
```

`React.cache()` dedup trong một request đơn lẻ — nếu ba server components trên cùng một trang gọi `getSquad()`, chỉ có một network request được thực hiện.

---

## 7. Luồng Dữ Liệu: Provider → Component

```typescript
// src/app/squad/page.tsx (Server Component)
import { getSquad } from '@/lib/football';

export const revalidate = 3600; // ISR: re-fetch tối đa một lần mỗi giờ

export default async function SquadPage() {
  const players = await getSquad();
  return <SquadGrid players={players} />;
}
```

```typescript
// src/app/standings/page.tsx — fetches song song
import { getStandings, getUclStandings } from '@/lib/football';

export default async function StandingsPage() {
  const [pl, ucl] = await Promise.all([getStandings(), getUclStandings()]);
  return <StandingsTabs pl={pl} ucl={ucl} />;
}
```

---

## 8. Xử Lý Lỗi & Giảm Hạ Cấp An Toàn

Mọi hàm export trong barrel đều theo cùng một pattern:

1. Kiểm tra env var cần thiết — trả về rỗng / null và cảnh báo nếu thiếu
2. `try/catch` bao quanh fetch thực tế
3. Trả về mảng rỗng / `null` khi thất bại — không bao giờ throw lên trang

```typescript
export const getStandings = cache(async (season?: number) => {
  if (!hasFdoKey) {
    console.warn('[football] FOOTBALL_DATA_ORG_KEY not set — no standings');
    return [];
  }
  try {
    return await getFdoStandings(season);
  } catch (err) {
    console.error('[football] FDO standings failed:', err);
    return []; // trang render empty state, không phải lỗi
  }
});
```

Các trang nên xử lý trường hợp rỗng bằng UI fallback thay vì giả định dữ liệu luôn tồn tại:

```typescript
// src/app/standings/page.tsx
const standings = await getStandings();
if (standings.length === 0) return <EmptyState message="Standings unavailable" />;
```

---

## 9. Thêm Provider Mới

### Bước 1 — Tạo provider class

```typescript
// src/lib/football/sofascore-provider.ts
import type { FootballDataProvider } from './provider';
import type { Player, Fixture /* ... */ } from '@/lib/types/football';

export class SofaScoreProvider implements FootballDataProvider {
  readonly name = 'sofascore';

  async getSquad(): Promise<Player[]> {
    const res = await fetch('https://api.sofascore.com/...', {
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    return data.players.map(mapSofaScorePlayer); // ánh xạ về canonical Player
  }

  // triển khai tất cả các method của interface ...
}
```

### Bước 2 — Đăng ký trong barrel

```typescript
// src/lib/football/index.ts — thêm vào logic chọn provider
import { SofaScoreProvider } from './sofascore-provider';

function createProvider(): FootballDataProvider {
  if (process.env.SOFASCORE_KEY) return new SofaScoreProvider();
  if (process.env.FOOTBALL_DATA_ORG_KEY) return new FdoProvider();
  return new MockProvider();
}
```

### Bước 3 — Thêm env var

```bash
# .env.local
SOFASCORE_KEY=your_key
```

### Bước 4 — Build lại

```bash
npm run build
```

### Quy tắc ánh xạ

- Luôn ánh xạ về đúng cấu trúc được định nghĩa trong `src/lib/types/football.ts`
- Không bao giờ để lộ provider-specific types ra ngoài file provider
- Nếu một trường không có trong API mới, đặt nó thành `null` hoặc `undefined` theo định nghĩa kiểu
- Thêm `console.info('[sofascore] provider loaded')` khi dev để dễ kiểm tra provider nào đang hoạt động

---

## 10. Biến Môi Trường

| Biến | Provider | Bắt buộc |
|----------|---------|---------|
| `FOOTBALL_DATA_ORG_KEY` | Football-Data.org | Có (để lấy dữ liệu live) |

Khi không có `FOOTBALL_DATA_ORG_KEY`, tất cả hàm FDO trả về mảng rỗng/null và log cảnh báo. Ứng dụng vẫn hoạt động bình thường với empty states.

ESPN không cần thông tin xác thực và luôn hoạt động.
