# Tiêu Chuẩn Code

LiverpoolApp — Next.js 16 (App Router) + TypeScript + Tailwind v4 + Supabase.

---

## 1. Server vs Client Components

### Nguyên tắc cơ bản

Mặc định dùng **Server Components**. Chỉ thêm `'use client'` khi cần tương tác (hooks, event handlers, browser APIs).

### Server Components

```typescript
// src/app/squad/page.tsx
import { getSquad } from '@/lib/football'; // server-only import

export default async function SquadPage() {
  const players = await getSquad(); // await trực tiếp, React.cache tự dedup
  return <SquadGrid players={players} />;
}
```

- Có thể `await` promise trực tiếp trong thân component
- Có thể import từ `src/lib/football` và `src/lib/supabase-server`
- Không dùng được `useState`, `useEffect`, event handlers
- Dữ liệu chạy một chiều: server render → truyền serialisable props xuống client

### Client Components

```typescript
// src/components/squad/squad-grid.tsx
'use client';

import { useState } from 'react';

export default function SquadGrid({ players }: { players: Player[] }) {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? players : players.filter(p => p.position === filter);
  return (
    <>
      <PositionTabs value={filter} onChange={setFilter} />
      {filtered.map(p => <PlayerCard key={p.id} player={p} />)}
    </>
  );
}
```

- Phải khai báo `'use client'` ở đầu file
- Dùng được tất cả React hooks
- Không thể `await` ở top-level; không import được module `server-only`
- Nhận dữ liệu từ server dưới dạng serialisable props

### Navbar pattern (phân tách quan trọng)

```typescript
// src/components/layout/navbar.tsx — Server
import { createServerSupabaseClient } from '@/lib/supabase-server';
import NavbarClient from './navbar-client';

export default async function NavbarAuth() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = user ? await getProfile(user.id) : null;
  return <NavbarClient user={user} profile={profile} />;
}

// src/components/layout/navbar-client.tsx — Client
'use client';
export default function NavbarClient({ user, profile }: Props) {
  // hooks, event handlers đặt ở đây
}
```

Root layout dùng `<NavbarAuth />`, không dùng `<Navbar />` cũ.

---

## 2. Phân Tách Supabase Client (QUAN TRỌNG)

Hai client riêng biệt — **tuyệt đối không dùng lẫn lộn**.

| File | Mục đích | Dùng ở đâu |
|------|---------|--------------|
| `src/lib/supabase.ts` | Browser client (`createBrowserClient`) | Chỉ dùng trong `'use client'` components |
| `src/lib/supabase-server.ts` | Server client (`createServerClient`) | Server components, API routes |
| `src/lib/news/supabase-service.ts` | Service role client | Chỉ dùng trong admin/cron API routes |

```typescript
// SAI — sẽ gây lỗi build
// Trong một client component:
import { createServerSupabaseClient } from '@/lib/supabase-server'; // có guard "server-only"

// SAI — trạng thái auth sẽ không đồng bộ
// Trong một server component:
import { createClient } from '@/lib/supabase'; // browser-only client
```

```typescript
// Đúng — client component
'use client';
import { createClient } from '@/lib/supabase';
const supabase = createClient();

// Đúng — server component / API route
import { createServerSupabaseClient } from '@/lib/supabase-server';
const supabase = createServerSupabaseClient();
```

`supabase-server.ts` có `import "server-only"` — nếu import nó trong client component sẽ gây **lỗi build**, đây là cố ý.

---

## 3. Hệ Thống Kiểu

### Các kiểu chuẩn (canonical types)

Toàn bộ kiểu dữ liệu bóng đá nằm trong `src/lib/types/football.ts`. Mỗi provider đều ánh xạ response từ API của mình về các kiểu này. Không bao giờ dùng `any` trong component props.

```typescript
// src/lib/types/football.ts
export interface Player {
  id: number;
  name: string;
  position: string;
  number: number;
  photo?: string;
  nationality?: string;
  age?: number;
  stats: PlayerStats | null;
}

export interface Fixture {
  id: number;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: 'scheduled' | 'live' | 'finished' | 'postponed';
  league: { name: string; round: string };
}
```

### Kiểu DB của Supabase

`src/lib/supabase.ts` export `UserProfile`, `FavouritePlayer`, `SavedArticle` — được suy luận từ schema Supabase. Dùng những kiểu này cho mọi thao tác với DB row.

### Cấu hình TypeScript

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true
  }
}
```

Strict mode được bật bắt buộc. `npm run build` sẽ thất bại nếu có lỗi kiểu.

---

## 4. Quy Ước Đặt Tên

| Loại | Quy ước | Ví dụ |
|----------|-----------|---------|
| Files | kebab-case | `player-card.tsx`, `fdo-provider.ts` |
| Thư mục | kebab-case | `src/components/squad/` |
| Components | PascalCase | `PlayerCard`, `SquadGrid` |
| Functions | camelCase | `getSquad()`, `mapToPlayer()` |
| Constants | UPPER_SNAKE_CASE | `MOCK_SQUAD`, `FDO_LFC_ID` |
| CSS classes | kebab-case | `bg-lfc-red`, `text-stadium-muted` |
| DB tables | snake_case | `user_profiles`, `favourite_players` |
| DB columns | snake_case | `user_id`, `created_at` |
| Types / Interfaces | PascalCase | `Player`, `FootballDataProvider` |
| Enums | PascalCase | `MatchStatus`, `PlayerPosition` |

---

## 5. Xử Lý Lỗi

### Error boundaries ở cấp trang

Mỗi thư mục route có thể có một file `error.tsx` (phải là `'use client'`):

```typescript
// src/app/squad/error.tsx
'use client';
export default function SquadError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="text-center py-20">
      <p className="text-stadium-muted">{error.message}</p>
      <button onClick={reset} className="mt-4 bg-lfc-red text-white px-6 py-2 rounded">
        Thử lại
      </button>
    </div>
  );
}
```

### Giảm hạ cấp API một cách an toàn

Tất cả các hàm football data đều bắt lỗi và trả về giá trị rỗng an toàn — trang sẽ render trạng thái rỗng thay vì crash.

```typescript
export const getStandings = cache(async () => {
  if (!hasFdoKey) {
    console.warn('[football] FOOTBALL_DATA_ORG_KEY not set');
    return [];
  }
  try {
    return await getFdoStandings();
  } catch (err) {
    console.error('[football] standings failed:', err);
    return []; // trạng thái rỗng an toàn
  }
});
```

### try/catch trong server actions và API routes

```typescript
// src/app/api/news/sync/route.ts
export async function GET(req: Request) {
  try {
    await syncRssFeeds();
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[news/sync] failed:', err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
```

---

## 6. Quy Tắc Styling

### Chỉ dùng Tailwind — không dùng inline styles

```typescript
// ĐÚNG
<div className="flex items-center gap-4 p-6 bg-stadium-surface border border-stadium-border rounded-lg" />

// SAI
<div style={{ display: 'flex', padding: '24px' }} />
```

### Utility cn()

Dùng `cn()` từ `src/lib/utils.ts` (bao gồm `clsx` + `tailwind-merge`) khi classes có điều kiện:

```typescript
import { cn } from '@/lib/utils';

<div className={cn(
  'px-4 py-2 rounded font-barlow text-sm uppercase tracking-wide',
  isActive && 'bg-lfc-red text-white',
  !isActive && 'text-stadium-muted hover:text-white'
)} />
```

### Không dùng CSS modules

Không tạo file `.module.css`. Tất cả styles đều qua Tailwind utility classes.

### Design tokens

Dùng semantic token classes (`bg-stadium-bg`, `text-lfc-red`, `border-stadium-border`) thay vì giá trị hex trực tiếp. Tokens được định nghĩa là CSS custom properties trong `src/app/globals.css` và ánh xạ trong Tailwind config.

---

## 7. Các Pattern Animation

### Framer Motion variants

Định nghĩa variants bên ngoài component để tránh tạo lại mỗi lần render:

```typescript
// Tái sử dụng từ src/lib/animation-variants.ts (hoặc định nghĩa inline cho trường hợp dùng một lần)
export const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};
```

```typescript
import { motion } from 'framer-motion';
import { fadeUp, stagger } from '@/lib/animation-variants';

<motion.ul variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
  {items.map(item => (
    <motion.li key={item.id} variants={fadeUp}>{item.name}</motion.li>
  ))}
</motion.ul>
```

### Tôn trọng reduced motion

Tất cả animation Framer Motion tự động tuân thủ `prefers-reduced-motion` khi dùng `whileInView`/`animate`. Với CSS keyframes, thêm override trong `globals.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 8. Xử Lý Hình Ảnh

### Luôn dùng `<Image>` của Next.js

```typescript
import Image from 'next/image';

<Image
  src={player.photo ?? '/placeholder-player.png'}
  alt={player.name}
  width={300}
  height={400}
  className="w-full aspect-[3/4] object-cover object-top"
  priority={isAboveFold}
/>
```

- Đặt `width` và `height` rõ ràng — tránh layout shift
- Dùng `priority` cho ảnh above-the-fold (hero, 3 cầu thủ đầu tiên trong lưới)
- Ảnh Cloudinary đi qua helper `src/lib/cloudinary.ts` để lấy transform URL

### Ảnh cầu thủ

```typescript
import { getPlayerPhoto } from '@/lib/player-photos';
// Trả về URL đã ánh xạ hoặc '/placeholder-player.png'
const src = getPlayerPhoto(player.id);
```

---

## 9. Quy Ước Git Commit

```
feat: add ESPN cup fixtures to match feed
fix: handle FDO rate limit error response
refactor: extract FDO standings to separate module
perf: wrap getStandings in React.cache()
docs: add data-providers guide
test: add unit tests for season-stats computation
chore: upgrade to Next.js 16.2
```

Dùng chữ thường, thể mệnh lệnh. Không có dấu chấm cuối. Tiêu đề tối đa 72 ký tự.

---

## 10. Checklist Hiệu Suất

- [ ] Tất cả hàm trong `src/lib/football` được bọc bằng `React.cache()` (đã làm trong barrel `index.ts`)
- [ ] Các fetch ở cấp trang được chạy song song bằng `Promise.all()` khi độc lập nhau
- [ ] Thời gian ISR revalidation được đặt cho từng route (`export const revalidate = 3600`)
- [ ] `<Image>` dùng với kích thước rõ ràng trên mọi ảnh
- [ ] Không có module `server-only` nào được import trong client bundles
- [ ] Danh sách dài được phân trang hoặc virtualised
- [ ] Thêm `loading.tsx` cho các route có async data fetches

---

## 11. Checklist Accessibility

- [ ] Độ tương phản màu ≥4.5:1 cho body text (WCAG AA) — chữ trắng trên `#1A1A1A` là ~13:1
- [ ] Focus rings trên tất cả phần tử tương tác: `focus-visible:ring-2 focus-visible:ring-lfc-red`
- [ ] Touch targets ≥44×44px
- [ ] ARIA labels trên các nút chỉ có icon (`aria-label="Toggle navigation"`)
- [ ] Alt text trên tất cả `<Image>` components
- [ ] HTML ngữ nghĩa — `<button>` không phải `<div onClick>`, `<nav>`, `<main>`, `<article>`
- [ ] Skip link trong layout: `<a href="#main" className="sr-only focus:not-sr-only">`
- [ ] `prefers-reduced-motion` được tuân thủ trong toàn bộ code animation
